"""Tests for crystal-mcp: tool registration, protocol handling, and type serialisation."""

import asyncio
import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "src"))

from crystal_mcp import MCPServer, tool, resource, prompt, ToolResult, ResourceContent, PromptMessage
from crystal_mcp.tool import _REGISTRY


def _fresh_registry():
    """Reset the global registry between tests."""
    _REGISTRY["tools"].clear()
    _REGISTRY["resources"].clear()
    _REGISTRY["prompts"].clear()


# ── Types ─────────────────────────────────────────────────────────────────────

class TestToolResult:
    def test_to_mcp_success(self):
        r = ToolResult(content="hello")
        mcp = r.to_mcp()
        assert mcp["content"] == [{"type": "text", "text": "hello"}]
        assert mcp["isError"] is False

    def test_to_mcp_error(self):
        r = ToolResult(content="oops", is_error=True)
        assert r.to_mcp()["isError"] is True

    def test_metadata_not_in_mcp(self):
        r = ToolResult(content="x", metadata={"foo": "bar"})
        mcp = r.to_mcp()
        assert "metadata" not in mcp


class TestResourceContent:
    def test_to_mcp(self):
        rc = ResourceContent(uri="file://test.txt", text="content here")
        mcp = rc.to_mcp()
        assert mcp["uri"] == "file://test.txt"
        assert mcp["text"] == "content here"
        assert mcp["mimeType"] == "text/plain"

    def test_custom_mime_type(self):
        rc = ResourceContent(uri="data://x", text="{}", mime_type="application/json")
        assert rc.to_mcp()["mimeType"] == "application/json"


class TestPromptMessage:
    def test_to_mcp(self):
        pm = PromptMessage(role="user", content="Say hello.")
        mcp = pm.to_mcp()
        assert mcp["role"] == "user"
        assert mcp["content"] == {"type": "text", "text": "Say hello."}


# ── Tool registration ─────────────────────────────────────────────────────────

class TestToolDecorator:
    def setup_method(self):
        _fresh_registry()

    def test_registers_by_function_name(self):
        @tool(description="Add two integers")
        def add(a: int, b: int) -> ToolResult:
            return ToolResult(content=str(a + b))

        assert "add" in _REGISTRY["tools"]

    def test_registers_with_custom_name(self):
        @tool(name="my_adder", description="Add")
        def add_fn(a: int, b: int) -> ToolResult:
            return ToolResult(content=str(a + b))

        assert "my_adder" in _REGISTRY["tools"]
        assert "add_fn" not in _REGISTRY["tools"]

    def test_schema_inferred_from_types(self):
        @tool(description="Echo a string")
        def echo(message: str) -> ToolResult:
            return ToolResult(content=message)

        schema = _REGISTRY["tools"]["echo"]["inputSchema"]
        assert schema["properties"]["message"]["type"] == "string"
        assert "message" in schema["required"]

    def test_callable_through_registry(self):
        @tool(description="Multiply")
        def multiply(x: int, y: int) -> ToolResult:
            return ToolResult(content=str(x * y))

        result = _REGISTRY["tools"]["multiply"]["fn"](x=3, y=4)
        assert result.content == "12"

    def test_wrapper_preserves_callable(self):
        @tool(description="Noop")
        def noop() -> ToolResult:
            return ToolResult(content="ok")

        assert noop() == ToolResult(content="ok")


# ── Resource registration ─────────────────────────────────────────────────────

class TestResourceDecorator:
    def setup_method(self):
        _fresh_registry()

    def test_registers_with_uri_template(self):
        @resource("file://{path}", description="Read file")
        def read_file(path: str) -> ResourceContent:
            return ResourceContent(uri=f"file://{path}", text="data")

        assert "file://{path}" in _REGISTRY["resources"]

    def test_callable_through_registry(self):
        @resource("data://{key}", description="Key-value store")
        def get_data(key: str) -> ResourceContent:
            return ResourceContent(uri=f"data://{key}", text=f"value_of_{key}")

        result = _REGISTRY["resources"]["data://{key}"]["fn"]("mykey")
        assert result.text == "value_of_mykey"


# ── Prompt registration ───────────────────────────────────────────────────────

class TestPromptDecorator:
    def setup_method(self):
        _fresh_registry()

    def test_registers_prompt(self):
        @prompt(description="Generate a greeting")
        def greet(name: str) -> list:
            return [PromptMessage(role="user", content=f"Hello, {name}!")]

        assert "greet" in _REGISTRY["prompts"]

    def test_arguments_extracted(self):
        @prompt(description="Code review")
        def code_review(code: str, language: str = "python") -> list:
            return []

        args = _REGISTRY["prompts"]["code_review"]["arguments"]
        names = [a["name"] for a in args]
        assert "code" in names
        assert "language" in names

    def test_callable_through_registry(self):
        @prompt(description="Test")
        def my_prompt(topic: str) -> list:
            return [PromptMessage(role="user", content=f"Tell me about {topic}")]

        result = _REGISTRY["prompts"]["my_prompt"]["fn"](topic="AI")
        assert result[0].content == "Tell me about AI"


# ── MCPServer protocol ────────────────────────────────────────────────────────

class TestMCPServerProtocol:
    def setup_method(self):
        _fresh_registry()

    def _run(self, coro):
        return asyncio.run(coro)

    def test_initialize_returns_server_info(self):
        server = MCPServer(name="test-server", version="9.9.9")
        result = self._run(server._handle_initialize({}))
        assert result["serverInfo"]["name"] == "test-server"
        assert result["serverInfo"]["version"] == "9.9.9"
        assert "tools" in result["capabilities"]
        assert "resources" in result["capabilities"]
        assert "prompts" in result["capabilities"]

    def test_tools_list_returns_registered_tools(self):
        @tool(description="Say hi")
        def hi() -> ToolResult:
            return ToolResult(content="hi")

        server = MCPServer()
        result = self._run(server._handle_tools_list({}))
        names = [t["name"] for t in result["tools"]]
        assert "hi" in names

    def test_tools_call_executes_function(self):
        @tool(description="Double a number")
        def double(n: int) -> ToolResult:
            return ToolResult(content=str(n * 2))

        server = MCPServer()
        result = self._run(server._handle_tools_call({"name": "double", "arguments": {"n": 5}}))
        assert result["content"][0]["text"] == "10"

    def test_tools_call_unknown_raises(self):
        server = MCPServer()
        try:
            self._run(server._handle_tools_call({"name": "does_not_exist", "arguments": {}}))
            assert False, "should raise"
        except ValueError as e:
            assert "does_not_exist" in str(e)

    def test_handle_dispatch_unknown_method(self):
        server = MCPServer()
        resp = self._run(server._handle({"jsonrpc": "2.0", "id": 1, "method": "unknown/method"}))
        assert resp["error"]["code"] == -32601

    def test_handle_notification_no_id_returns_none(self):
        server = MCPServer()
        resp = self._run(server._handle({"jsonrpc": "2.0", "method": "unknown/notify"}))
        assert resp is None

    def test_resources_list(self):
        @resource("mem://{key}", description="In-memory store")
        def mem_read(key: str) -> ResourceContent:
            return ResourceContent(uri=f"mem://{key}", text="val")

        server = MCPServer()
        result = self._run(server._handle_resources_list({}))
        uris = [r["uri"] for r in result["resources"]]
        assert "mem://{key}" in uris

    def test_prompts_list(self):
        @prompt(description="A test prompt")
        def test_p(x: str) -> list:
            return [PromptMessage(role="user", content=x)]

        server = MCPServer()
        result = self._run(server._handle_prompts_list({}))
        names = [p["name"] for p in result["prompts"]]
        assert "test_p" in names

    def test_prompts_get(self):
        @prompt(description="Greet")
        def hello_p(name: str) -> list:
            return [PromptMessage(role="user", content=f"Hi {name}")]

        server = MCPServer()
        result = self._run(server._handle_prompts_get({"name": "hello_p", "arguments": {"name": "World"}}))
        assert result["messages"][0]["role"] == "user"
        assert "World" in result["messages"][0]["content"]["text"]

    def test_prompts_get_unknown_raises(self):
        server = MCPServer()
        try:
            self._run(server._handle_prompts_get({"name": "no_such_prompt", "arguments": {}}))
            assert False, "should raise"
        except ValueError:
            pass

    def test_error_response_format(self):
        server = MCPServer()
        err = server._error(42, -32600, "Invalid Request")
        assert err["id"] == 42
        assert err["error"]["code"] == -32600
        assert err["error"]["message"] == "Invalid Request"
