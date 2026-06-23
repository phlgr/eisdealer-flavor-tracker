FROM mcr.microsoft.com/playwright:v1.61.1-noble@sha256:b48abd6e59fb69b2acfea52553a4d6b0e2530d1bcad15456e6095d6b222dbced

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

# Chromium is already in the playwright base image
# Keep container alive for dokploy scheduled jobs
CMD ["tail", "-f", "/dev/null"]
