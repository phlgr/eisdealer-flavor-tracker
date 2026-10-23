FROM mcr.microsoft.com/playwright:v1.64.1-noble@sha256:47b510dd9230bf0b9bfc9b20102241e577ea7a99334ab4c3ca19f19770e9b8ea

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
