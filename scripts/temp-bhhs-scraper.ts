#!/usr/bin/env node

import { createClient } from "@supabase/supabase-js";
import puppeteer from "puppeteer";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);

function titleCase(str: string): string {
  return str
    .split(" ")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function scrapeBHHSCity(
  city: string,
  state: string,
  timezone: string
): Promise<{ inserted: number; duplicates: number; skipped: number }> {
  console.log(`\n🔍 Scraping BHHS for ${city}, ${state}...`);

  const browser = await puppeteer.connect({ browserURL: "http://localhost:9222" });
  const pages = await browser.pages();
  const page = pages[0] || (await browser.newPage());

  let inserted = 0,
    duplicates = 0,
    skipped = 0;

  try {
    // Navigate to homepage for cookies
    await page.goto("https://www.bhhs.com", {
      waitUntil: "networkidle2",
      timeout: 30000,
    });
    await sleep(2000);

    // Paginate through Solr API
    for (let pageNum = 1; pageNum <= 12; pageNum++) {
      const agents = await page.evaluate(
        async (pageNum: number, city: string, state: string) => {
          const encodedCity = city.replace(" ", "+");
          const url = `https://www.bhhs.com/bin/bhhs/solrAgentSearchServlet?city=${encodedCity}%2C+${state}%2C+USA&resultSize=50&sortType=3&page=${pageNum}&geo_sort_param_name=city&geo_sort_param_value=${encodedCity}%2B${state}%2B+USA`;
          const response = await fetch(url, { credentials: "include" });
          const data = (await response.json()) as any;
          return data.value || [];
        },
        pageNum,
        city,
        state
      );

      if (agents.length === 0) {
        console.log(`  Page ${pageNum}: 0 agents, stopping`);
        break;
      }

      console.log(`  Page ${pageNum}: ${agents.length} agents`);

      for (const agent of agents) {
        // Validate email
        if (!agent.MemberEmail || !agent.MemberEmail.includes("@")) {
          skipped++;
          continue;
        }

        // Parse name
        const fullName = titleCase(agent.MemberFullName || "");
        const parts = fullName.split(" ");

        if (
          parts.length < 2 ||
          fullName.length < 3 ||
          fullName.length > 100
        ) {
          skipped++;
          continue;
        }

        const lead = {
          full_name: fullName,
          first_name: parts[0],
          last_name: parts.slice(1).join(" "),
          email: agent.MemberEmail.toLowerCase(),
          phone: agent.MemberMobilePhone || agent.MemberOfficePhone || null,
          profile_picture_url: agent.Photo || null,
          source_brokerage: "bhhs",
          country: "US",
          state_province: state,
          city: city,
          timezone: timezone,
        };

        // Insert to Supabase
        const { error } = await supabaseAdmin.from("leads").insert([lead]);

        if (!error) {
          inserted++;
        } else if (error.message.includes("409")) {
          duplicates++;
        } else {
          skipped++;
          console.log(`  ⚠️  Insert error for ${lead.email}: ${error.message}`);
        }

        // Rate limiting
        if ((inserted + duplicates + skipped) % 20 === 0) {
          await sleep(1000);
        }
      }

      if (agents.length < 50) break;
      await sleep(2000);
    }
  } finally {
    await browser.disconnect();
  }

  console.log(
    `✅ ${city}, ${state} - BHHS: Inserted=${inserted}, Duplicates=${duplicates}, Skipped=${skipped}`
  );
  return { inserted, duplicates, skipped };
}

async function main() {
  const cities = [
    { city: "Jacksonville", state: "FL", tz: "EST" },
    { city: "Philadelphia", state: "PA", tz: "EST" },
    { city: "Portland", state: "OR", tz: "PST" },
    { city: "Sacramento", state: "CA", tz: "PST" },
  ];

  let totalInserted = 0,
    totalDuplicates = 0;

  for (const { city, state, tz } of cities) {
    const result = await scrapeBHHSCity(city, state, tz);
    totalInserted += result.inserted;
    totalDuplicates += result.duplicates;
  }

  console.log(
    `\n🎉 Session Total: Inserted=${totalInserted}, Duplicates=${totalDuplicates}`
  );
}

main().catch(console.error);
