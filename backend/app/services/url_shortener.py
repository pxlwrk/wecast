"""Base62 URL shortener utility."""

BASE62 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz"


def encode(num: int) -> str:
    """Encode a positive integer as a Base62 string."""
    if num <= 0:
        return BASE62[0]
    result: list[str] = []
    while num:
        result.append(BASE62[num % 62])
        num //= 62
    return "".join(reversed(result))


def decode(code: str) -> int:
    """Decode a Base62 string back to an integer."""
    result = 0
    for char in code:
        result = result * 62 + BASE62.index(char)
    return result


def make_short_url(base_url: str, code: str) -> str:
    """Construct the full short URL from a code."""
    return f"{base_url.rstrip('/')}/s/{code}"
