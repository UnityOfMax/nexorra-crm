import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Generate an animated GIF from a video file using ffmpeg.
 * Extracts the first few seconds at 10fps, scaled to 480px wide.
 *
 * @param videoPath - Path to the input video file
 * @param outputPath - Path for the output GIF file
 * @param duration - Duration in seconds to extract (default: 3)
 * @returns The output path on success
 */
export async function generateGif(
  videoPath: string,
  outputPath: string,
  duration: number = 3
): Promise<string> {
  // Validate input file exists
  if (!fs.existsSync(videoPath)) {
    throw new Error(`Input video not found: ${videoPath}`);
  }

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Clamp duration to a reasonable range
  const clampedDuration = Math.max(1, Math.min(duration, 10));

  const command = [
    'ffmpeg',
    `-i "${videoPath}"`,
    `-t ${clampedDuration}`,
    '-vf "fps=10,scale=480:-1:flags=lanczos"',
    '-gifflags +transdiff',
    '-y',
    `"${outputPath}"`,
  ].join(' ');

  try {
    execSync(command, { stdio: 'pipe', timeout: 60_000 });
  } catch (err: unknown) {
    // Check if ffmpeg is installed
    try {
      execSync('which ffmpeg', { stdio: 'pipe' });
    } catch {
      throw new Error(
        'ffmpeg is not installed or not in PATH. Install it with: sudo apt install ffmpeg'
      );
    }

    // ffmpeg exists but the conversion failed
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`GIF generation failed: ${message}`);
  }

  // Verify output was created
  if (!fs.existsSync(outputPath)) {
    throw new Error(`GIF was not created at: ${outputPath}`);
  }

  return outputPath;
}
