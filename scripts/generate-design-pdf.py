#!/usr/bin/env python3
"""Generate DESIGN_DOCUMENT.pdf."""

from pathlib import Path

from fpdf import FPDF

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "docs" / "DESIGN_DOCUMENT.pdf"

QUERY_EXAMPLES = [
    ("5.1 Conversation filters", [
        ("Show open conversations", "9 rows - all status = open"),
        ("List closed conversations", "6 rows - all status = closed"),
        ("Show conversation id 7", "1 row - API rate limit question"),
        ("Conversations with title containing billing", "1 row - id 1"),
        ("Show all conversations ordered by created_at descending", "15 rows - newest first (id 13)"),
    ]),
    ("5.2 Message search", [
        ("Find messages containing refund", "3 rows - conv 2 (x2) and conv 6"),
        ("Messages from user role only", "15 rows - role = user"),
        ("Messages from assistant", "13 rows - role = assistant"),
        ("Messages in conversation 7", "2 rows - API thread"),
        ("Find messages containing password", "2 rows - conv 8 and 11"),
    ]),
    ("5.3 Tag filters", [
        ("Conversations tagged billing", "4 rows - ids 1, 2, 5, 6"),
        ("Conversations tagged security", "2 rows - ids 8, 11"),
        ("Conversations tagged bug", "2 rows - ids 12, 13"),
        ("Conversations tagged refund", "2 rows - ids 2, 5"),
        ("Conversations tagged mobile", "1 row - id 13"),
    ]),
    ("5.4 Date filters", [
        ("Show conversations from the last 7 days", "5 rows - ids 1, 5, 8, 12, 13"),
        ("Conversations created after 2026-05-25", "5 rows - ids 1, 5, 8, 12, 13"),
        ("Closed conversations created before 2026-06-01", "6 rows - all closed"),
        ("Conversations created before 2026-03-01", "2 rows - ids 14, 15"),
        ("Messages from the last 30 days", "26 rows - all except conv 14-15"),
    ]),
    ("5.5 Combined filters", [
        ("Open conversations tagged billing", "2 rows - ids 1, 5"),
        ("Open conversations tagged bug", "2 rows - ids 12, 13"),
        ("Closed conversations tagged refund", "1 row - id 2"),
        ("Messages about API rate limits", "2 rows - conversation 7"),
        ("Open conversations from the last 7 days", "3 rows - ids 5, 8, 13"),
    ]),
]


class Doc(FPDF):
    def header(self):
        if self.page_no() > 1:
            self.set_font("Helvetica", "I", 8)
            self.set_text_color(100, 100, 100)
            self.cell(0, 8, "NL to Safe SQL - Design Document", align="R", new_x="LMARGIN", new_y="NEXT")
            self.ln(2)

    def footer(self):
        self.set_y(-12)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(120, 120, 120)
        self.cell(0, 8, f"Page {self.page_no()}", align="C")

    def title_block(self, title: str, subtitle: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 20)
        self.set_text_color(20, 40, 80)
        self.multi_cell(0, 10, title)
        self.ln(2)
        self.set_font("Helvetica", "", 11)
        self.set_text_color(60, 60, 60)
        self.multi_cell(0, 6, subtitle)
        self.ln(6)

    def h1(self, text: str):
        self.set_x(self.l_margin)
        self.ln(4)
        self.set_font("Helvetica", "B", 14)
        self.set_text_color(20, 40, 80)
        self.multi_cell(0, 8, text)
        self.ln(2)

    def h2(self, text: str):
        self.set_x(self.l_margin)
        self.ln(2)
        self.set_font("Helvetica", "B", 11)
        self.set_text_color(30, 60, 110)
        self.multi_cell(0, 7, text)
        self.ln(1)

    def body(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, text)
        self.ln(1)

    def bullet(self, text: str):
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "", 10)
        self.set_text_color(30, 30, 30)
        self.multi_cell(0, 5.5, f"  -  {text}")

    def table(self, headers: list[str], rows: list[list[str]], col_widths: list[int]):
        line_h = 5
        self.set_x(self.l_margin)
        self.set_font("Helvetica", "B", 9)
        self.set_fill_color(230, 236, 245)
        for h, w in zip(headers, col_widths):
            self.cell(w, 7, h, border=1, fill=True)
        self.ln()

        self.set_font("Helvetica", "", 8.5)

        def row_height(cells: list[str]) -> float:
            max_lines = 1
            for cell, w in zip(cells, col_widths):
                lines = self.multi_cell(w - 2, line_h, cell, dry_run=True, output="LINES")
                max_lines = max(max_lines, len(lines))
            return max(7.0, max_lines * line_h)

        for row in rows:
            x0 = self.l_margin
            y0 = self.get_y()
            rh = row_height(row)

            if y0 + rh > self.page_break_trigger:
                self.add_page()
                x0 = self.l_margin
                y0 = self.get_y()

            for i, (cell, w) in enumerate(zip(row, col_widths)):
                x = x0 + sum(col_widths[:i])
                self.rect(x, y0, w, rh)
                self.set_xy(x + 1, y0 + 1)
                self.multi_cell(w - 2, line_h, cell, border=0)

            self.set_xy(x0, y0 + rh)

        self.set_x(self.l_margin)
        self.ln(3)


def build():
    pdf = Doc()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.title_block(
        "NL to Safe SQL Execution Pipeline",
        "Design Document & Cover Letter\nAlexander Korbut  |  github.com/AlexKorbut  |  June 2026",
    )

    pdf.h1("1. Problem Statement")
    pdf.body(
        "Operational SaaS products often need a natural-language query interface so staff can "
        "explore inbox-style data without writing SQL. The naive approach - asking an LLM to emit "
        "SQL and executing it - creates severe risks: SQL injection, unbounded data access, "
        "non-deterministic queries, and schema hallucination."
    )
    pdf.body(
        "The required pipeline: users ask in plain language, but the LLM never produces executable SQL. "
        "It emits constrained Query Intent JSON that a deterministic transpiler turns into "
        "parameterized SQL against SQLite."
    )

    pdf.h2("Goals")
    for g in [
        "Safety by design - SQL injection structurally impossible; invalid intents fail closed",
        "Determinism - same intent JSON always produces the same SQL",
        "Testability - builder, validator, and pipeline testable without the LLM",
        "Operability - HTTP API, seed data, audit trail, debug visibility",
        "TypeScript - full implementation in TypeScript",
    ]:
        pdf.bullet(g)

    pdf.h1("2. Solution Options Considered")
    pdf.body(
        "All candidates assume an LLM in the NL understanding step. "
        "The decision was how the model participates, not whether to use one."
    )
    pdf.h2("Option A - LLM generates SQL + post-execution sandbox")
    pdf.body("Rejected. Parsing SQL reliably is hard; bypasses are common. Violates the core constraint.")
    pdf.h2("Option B - LLM generates Query Intent JSON + deterministic builder (CHOSEN)")
    pdf.body(
        "NL -> LLM -> Query Intent JSON -> Validator -> Query Builder -> SQLite. "
        "Separates probabilistic NL understanding from deterministic execution."
    )

    pdf.h1("3. Chosen Architecture")
    pdf.body(
        "Pipeline: Web UI / curl -> POST /query (Fastify) -> LlmService (OpenAI JSON) -> "
        "IntentValidator (Zod + whitelist) -> QueryBuilder (SELECT/JOIN/WHERE/ORDER BY/LIMIT) -> "
        "DatabaseExecutor (prepared statements) -> ResponseFormatter."
    )
    pdf.h2("Security layers")
    for s in [
        "Prompt contract - system prompt forbids SQL; response_format: json_object",
        "Zod schema - type: select only; known targets and operators",
        "Schema registry whitelist - allowed tables, fields, ops per field type",
        "Deterministic builder - only ? placeholders, no user value concatenation",
        "Fail-closed errors - validation -> HTTP 400; LLM failure -> HTTP 502",
    ]:
        pdf.bullet(s)

    pdf.h2("Data model")
    pdf.body(
        "Generic inbox schema to exercise the pipeline (15 conversations, 28 messages, 10 tags). "
        "The transpiler is domain-agnostic - only the registry and seed data are swappable."
    )
    pdf.table(
        ["Entity", "Key fields", "Purpose"],
        [
            ["conversations", "id, title, status, created_at", "Thread metadata; open/closed"],
            ["messages", "id, conversation_id, role, content", "role: user or assistant"],
            ["tags", "id, name", "Label catalog"],
            ["conversation_tags", "conversation_id, tag_id", "Many-to-many link"],
        ],
        [38, 62, 90],
    )

    pdf.h1("4. Validation Approach")
    pdf.table(
        ["Layer", "Validation"],
        [
            ["Date resolver", "Unit tests: -7 days, today, this month, ISO"],
            ["Intent validator", "Unit tests: forbidden tables/fields/ops/limits"],
            ["Query builder", "Unit tests: JOIN, WHERE, ORDER BY, LIMIT"],
            ["Pipeline", "Integration test with mock LLM"],
            ["Data layer", "npm run db:verify - 4 canned intents"],
            ["Manual E2E", "Web UI + TEST_QUERIES.md catalog"],
        ],
        [50, 140],
    )

    pdf.add_page()
    pdf.h1("5. Expected Query Behavior")
    pdf.body(
        "Seed reference date: 2026-06-03. Relative expressions (-7 days, today) resolve "
        "against the server clock at runtime."
    )

    for section_title, examples in QUERY_EXAMPLES:
        pdf.h2(section_title)
        pdf.table(
            ["Query", "Expected result"],
            [[q, r] for q, r in examples],
            [95, 95],
        )

    pdf.h1("6. Conclusion")
    pdf.body(
        "This project demonstrates a safe NL-to-data pipeline: the LLM is confined to a structured "
        "intent layer, and all executable SQL is produced deterministically with whitelists and "
        "prepared statements."
    )
    pdf.body(
        "The seed dataset and example queries validate core patterns - status filters, text search, "
        "tag joins, relative dates, and multi-condition queries - without coupling the architecture "
        "to any single business domain."
    )

    OUT.parent.mkdir(parents=True, exist_ok=True)
    pdf.output(str(OUT))
    print(f"Wrote {OUT}")


if __name__ == "__main__":
    build()
