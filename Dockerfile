# syntax=docker/dockerfile:1
# One image, two binaries: `api` (default; also serves the frontend) and `collector`.
# Published by .github/workflows/image.yml as ghcr.io/taowatch/validators.
FROM rust:1.100-alpine3.24 AS build
RUN apk add --no-cache musl-dev
WORKDIR /src
COPY Cargo.toml Cargo.lock ./
COPY crates crates
COPY migrations migrations
RUN --mount=type=cache,target=/usr/local/cargo/registry,sharing=locked \
    --mount=type=cache,target=/src/target,sharing=locked \
    cargo build --release --locked --bin api --bin collector \
 && cp target/release/api target/release/collector /usr/local/bin/

FROM alpine:3.24
RUN apk add --no-cache ca-certificates \
 && adduser -S -D -H -u 10001 vr
COPY --from=build /usr/local/bin/api /usr/local/bin/collector /usr/local/bin/
COPY web /app/web
ENV WEB_DIR=/app/web PORT=8080 RUST_LOG=info HEARTBEAT_FILE=/tmp/collector.alive
USER vr
EXPOSE 8080
# The api check; docker-compose.yml gives the collector its own (heartbeat file age).
HEALTHCHECK --interval=15s --timeout=3s --retries=10 CMD wget -qO- http://127.0.0.1:8080/api/health >/dev/null || exit 1
CMD ["api"]
