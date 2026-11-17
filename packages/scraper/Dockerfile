FROM mcr.microsoft.com/playwright:v1.65.1-noble@sha256:1507cbfc550a63a6b7396791ca4f00df17beb56342d2447b3f106c306f525579

# Install bun
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/* \
    && curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

WORKDIR /app

# Install dependencies first (better layer caching)
COPY package.json bun.lock* ./
COPY packages/scraper/package.json packages/scraper/
RUN bun install --frozen-lockfile --ignore-scripts \
    && bun packages/scraper/node_modules/ffmpeg-static/install.js

# Copy full repo (needed for git push)
COPY . .

# Fail the build if playwright cannot launch the Chromium shipped in this image
RUN bun run packages/scraper/scripts/smoke-browser.ts

# Chromium is already in the playwright base image
# Keep container alive for dokploy scheduled jobs
CMD ["tail", "-f", "/dev/null"]
