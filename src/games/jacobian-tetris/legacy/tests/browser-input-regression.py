#!/usr/bin/env python3
"""Browser regression for direct Jacobian keyboard entry.

Requires Python Playwright and an installed Chromium browser:
    python3 -m pip install playwright
    python3 -m playwright install chromium

Run from the repository root:
    python3 tests/browser-input-regression.py

Set `CHROMIUM_EXECUTABLE=/path/to/chromium` when using a system-installed browser.
"""

from __future__ import annotations

import contextlib
import http.server
import os
import socket
import socketserver
import threading
from pathlib import Path

from playwright.sync_api import sync_playwright

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


def advance_to_values(page, level: int, dependencies: list[tuple[int, int]], piece: str) -> None:
    page.locator(f'.level-dot[data-level="{level}"]').click()
    page.locator("#useExpectedShapeBtn").click()
    page.locator("#boardCheckBtn").click()
    for row, column in dependencies:
        page.locator(f'.matrix-cell[data-row="{row}"][data-column="{column}"]').click()
    page.locator("#boardCheckBtn").click()
    page.locator(f'[data-piece="{piece}"]').click()
    page.locator("#boardCheckBtn").click()


def main() -> None:
    with local_server() as url, sync_playwright() as playwright:
        executable = os.environ.get("CHROMIUM_EXECUTABLE")
        launch_options = {"headless": True}
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

        # Reproduce the exact screen that previously looked like a broken input.
        page.locator("#useExpectedShapeBtn").click()
        assert "LOCKED" in page.locator('.matrix-cell[data-row="0"][data-column="0"]').inner_text()
        assert "Confirm 1 × 1 board and continue" in page.locator("#boardCheckBtn").inner_text()
        page.locator("#boardCheckBtn").click()
        assert "Dependencies" in page.locator(".phase-step.active").inner_text()
        assert "Click cells — do not type yet" in page.locator(".board-phase-guide").inner_text()
        dependency_cell = page.locator('.matrix-cell[data-row="0"][data-column="0"]')
        assert dependency_cell.evaluate("element => element.tagName") == "BUTTON"
        assert "CLICK" in dependency_cell.inner_text()
        assert "depends?" in dependency_cell.inner_text()

        dependency_cell.click()
        assert dependency_cell.get_attribute("aria-pressed") == "true"
        page.locator("#boardCheckBtn").click()
        assert "Piece family" in page.locator(".phase-step.active").inner_text()
        assert "Choose a derivative piece" in page.locator(".board-phase-guide").inner_text()
        assert page.locator(".cell-editor").count() == 0

        page.locator('[data-piece="scalar"]').click()
        page.locator("#boardCheckBtn").click()
        assert "Derivative values" in page.locator(".phase-step.active").inner_text()
        assert "Type the Jacobian in the board" in page.locator(".board-phase-guide").inner_text()
        editor = page.locator(".cell-editor")
        assert editor.count() == 1 and editor.is_editable()
        assert page.evaluate("document.activeElement.id") == "cell-0-0"
        editor.fill("2x")
        editor.press("Enter")
        assert editor.input_value() == "2x"
        assert page.evaluate("document.activeElement.id") == "boardCheckBtn"
        page.locator("#boardCheckBtn").click()
        assert "Work order certified" in page.locator("#feedback").inner_text()

        advance_to_values(page, 3, [(0, 0), (1, 1), (2, 2)], "diagonal")
        assert page.locator(".cell-editor").count() == 3
        for row, column, value in [(0, 0, "2x1"), (1, 1, "2x2"), (2, 2, "2x3")]:
            cell = page.locator(
                f'.cell-editor[data-row="{row}"][data-column="{column}"]'
            )
            cell.fill(value)
            cell.press("Enter")
        page.locator("#boardCheckBtn").click()
        assert "Work order certified" in page.locator("#feedback").inner_text()

        # Repeat the direct-entry path at a phone-sized viewport.
        page.set_viewport_size({"width": 390, "height": 844})
        advance_to_values(page, 1, [(0, 0)], "scalar")
        mobile_editor = page.locator(".cell-editor")
        assert mobile_editor.count() == 1 and mobile_editor.is_editable()
        mobile_editor.fill("2x")
        assert mobile_editor.input_value() == "2x"
        assert page.evaluate("document.documentElement.scrollWidth <= document.documentElement.clientWidth")

        assert not page_errors, page_errors
        assert not console_errors, console_errors
        browser.close()

    print("PASS: direct Jacobian inputs are visible, editable, keyboard navigable, and validated")


if __name__ == "__main__":
    main()
