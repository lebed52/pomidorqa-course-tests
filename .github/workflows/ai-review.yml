name: AI Review

on:
  workflow_run:
    workflows: [Playwright CI]
    types: [completed]

permissions:
  contents: read
  pull-requests: write

concurrency:
  group: ai-review-${{ github.event.workflow_run.pull_requests[0].number }}
  cancel-in-progress: true

jobs:
  review:
    name: Review homework with Claude
    if: >-
      github.event.workflow_run.event == 'pull_request' &&
      github.event.workflow_run.conclusion == 'success' &&
      github.event.workflow_run.pull_requests[0] != null
    timeout-minutes: 5
    runs-on: ubuntu-latest

    steps:
      # Это привилегированный workflow: здесь доступны ключ Polza и write-token.
      # Никогда не checkout-им PR, не ставим его зависимости и не скачиваем его artifacts.
      - name: Checkout trusted reviewer from main
        uses: actions/checkout@v6
        with:
          ref: ${{ github.event.repository.default_branch }}
          persist-credentials: false

      - name: Setup Node.js
        uses: actions/setup-node@v6
        with:
          node-version: 24

      - name: Review Pull Request diff
        run: node scripts/ai-review.mjs
        env:
          AI_REVIEW_ALLOW_PUBLISH: true
          AI_REVIEW_HEAD_SHA: ${{ github.event.workflow_run.head_sha }}
          AI_REVIEW_PR_NUMBER: ${{ github.event.workflow_run.pull_requests[0].number }}
          GITHUB_TOKEN: ${{ github.token }}
          POLZA_AI_API_KEY: ${{ secrets.POLZA_AI_API_KEY }}
          POLZA_AI_MODEL: anthropic/claude-sonnet-5
