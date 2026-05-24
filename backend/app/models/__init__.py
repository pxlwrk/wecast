# Import all models so Alembic can discover them via Base.metadata
from app.models.audit_log import AuditLog  # noqa: F401
from app.models.episode import Episode  # noqa: F401
from app.models.show import Show  # noqa: F401
from app.models.short_url import ShortUrl  # noqa: F401
from app.models.user import RefreshToken, Role, User  # noqa: F401
from app.models.video import Video  # noqa: F401
