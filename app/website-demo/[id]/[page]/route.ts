import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

function injectScrollScript(html: string, sectionId: string): string {
  const script = `<script>
document.addEventListener('DOMContentLoaded',function(){
  var el=document.getElementById('${sectionId}');
  if(el){el.scrollIntoView({behavior:'instant'});window.scrollBy(0,-72);}
});
</script>`;
  const idx = html.lastIndexOf('</body>');
  if (idx !== -1) return html.slice(0, idx) + script + html.slice(idx);
  return html + script;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string; page: string } },
) {
  const { data: page } = await supabaseAdmin
    .from('landing_pages')
    .select('content, published')
    .eq('slug', params.id)
    .eq('page_type', 'website-demo')
    .single();

  if (!page || !page.published) {
    return new NextResponse('Not found', { status: 404 });
  }

  // 'home' = no scroll (show top), everything else = section ID to scroll to
  const sectionId = params.page === 'home' ? '' : params.page;
  const html = sectionId ? injectScrollScript(page.content, sectionId) : page.content;

  return new NextResponse(html, {
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'X-Robots-Tag': 'noindex',
    },
  });
}
