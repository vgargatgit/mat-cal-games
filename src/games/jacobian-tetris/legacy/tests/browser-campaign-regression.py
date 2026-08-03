#!/usr/bin/env python3
"""End-to-end browser regression for all Jacobian Tetris campaign levels.

Requires Python Playwright and Chromium. Set CHROMIUM_EXECUTABLE when using a
system-installed browser.
"""

from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import Page, sync_playwright

ROOT = Path(__file__).resolve().parents[1]


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *_args: object) -> None:
        pass


def free_port() -> int:
    with socket.socket() as sock:
        sock.bind(("127.0.0.1", 0))
        return int(sock.getsockname()[1])


@contextlib.contextmanager
def local_server():
    port = free_port()
    handler = lambda *args, **kwargs: QuietHandler(*args, directory=str(ROOT), **kwargs)
    with socketserver.TCPServer(("127.0.0.1", port), handler) as server:
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            yield f"http://127.0.0.1:{port}"
        finally:
            server.shutdown()
            thread.join(timeout=5)


def select_chain_item(page: Page, name: str) -> None:
    matches = page.locator("[data-add-chain]").filter(has_text=name)
    assert matches.count() == 1, f"Expected one chain item for {name!r}"
    matches.click()


def complete_level(page: Page, level: dict) -> None:
    level_id = level["id"]
    page.locator(f'.level-dot[data-level="{level_id}"]').click()

    assert "Board shape" in page.locator(".phase-step.active").inner_text()
    page.locator("#useExpectedShapeBtn").click()
    page.locator("#checkBtn").click()

    for phase in level["phases"][1:]:
        active = page.locator(".phase-step.active").inner_text()

        if phase == "dependencies":
            assert "Dependencies" in active
            assert "do not type yet" in page.locator(".board-phase-guide").inner_text()
            for row_index, row in enumerate(level["dependencies"]):
                for column_index, depends in enumerate(row):
                    if depends:
                        page.locator(
                            f'.matrix-cell[data-row="{row_index}"][data-column="{column_index}"]'
                        ).click()
            page.locator("#checkBtn").click()

        elif phase == "structure":
            assert "Piece family" in active
            page.locator(f'[data-piece="{level["structure"]}"]').click()
            page.locator("#checkBtn").click()

        elif phase == "values":
            assert "Derivative values" in active
            assert page.locator(".cell-editor").count() == sum(
                int(value) for row in level["dependencies"] for value in row
            )
            for row_index, row in enumerate(level["dependencies"]):
                for column_index, depends in enumerate(row):
                    if depends:
                        page.locator(
                            f'.cell-editor[data-row="{row_index}"][data-column="{column_index}"]'
                        ).fill(level["entries"][row_index][column_index])
            page.locator("#checkBtn").click()

        elif phase == "chain":
            assert "Chain order" in active
            for name in level["correctOrder"]:
                select_chain_item(page, name)
            page.locator("#checkBtn").click()

        else:
            raise AssertionError(f"Unsupported campaign phase: {phase}")

    feedback = page.locator("#feedback").inner_text()
    assert "Work order certified" in feedback, f"Level {level_id} failed: {feedback}"


def main() -> None:
    with local_server() as url, sync_playwright() as playwright:
        executable = os.environ.get("CHROMIUM_EXECUTABLE")
        launch_options: dict[str, object] = {"headless": True}
        if executable:
            launch_options["executable_path"] = executable
            launch_options["args"] = ["--no-sandbox"]

        browser = playwright.chromium.launch(**launch_options)
        page = browser.new_page(viewport={"width": 1440, "height": 1000})
        page_errors: list[str] = []
        console_errors: list[str] = []
        page.on("pageerror", lambda error: page_errors.append(str(error)))
        page.on(
            "console",
            lambda message: console_errors.append(message.text) if message.type == "error" else None,
        )
        page.goto(url, wait_until="networkidle")
        levels = page.evaluate(
            "async () => JSON.parse(JSON.stringify((await import('/js/levels.js')).LEVELS))"
        )

        page.locator("#testsBtn").click()
        assert "10 / 10 tests passed" in page.locator("#modalBody").inner_text()
        page.locator(".modal-close").click()

        for level in levels:
            complete_level(page, level)

        assert not page_errors, page_errors
        assert not console_errors, console_errors
        browser.close()

    print(f"PASS: completed all {len(levels)} campaign levels through visible browser controls")


if __name__ == "__main__":
    main()
