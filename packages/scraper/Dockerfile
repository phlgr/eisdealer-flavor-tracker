FROM mcr.microsoft.com/playwright:v1.52.0-noble

# Install bun
RUN apt-get update && apt-get install -y unzip && rm -rf /var/lib/apt/lists/*
RUN curl -fsSL https://bun.sh/install | bash
ENV PATH="/root/.bun/bin:${PATH}"

# Git is already in the base image

WORKDIR /app

# Copy full repo (needed for git push)
COPY . .

# Install dependencies
RUN bun install

# Install chromium
RUN bunx playwright install chromium

# Keep container alive for dokploy scheduled jobs
CMD ["tail", "-f", "/dev/null"]
