"""LDAP / Active Directory authentication and group resolution."""

import ssl
from dataclasses import dataclass
from typing import Optional

import structlog
from ldap3 import ALL_ATTRIBUTES, AUTO_BIND_NO_TLS, SUBTREE, Connection, Server, Tls
from ldap3.core.exceptions import LDAPBindError, LDAPException

from app.core.config import settings

log = structlog.get_logger(__name__)


@dataclass
class LDAPUser:
    dn: str
    username: str
    email: str
    display_name: str
    groups: list[str]  # list of group DNs


class LDAPAuthError(Exception):
    pass


def _build_server() -> Server:
    tls = None
    if settings.LDAP_URL.startswith("ldaps://"):
        validate = ssl.CERT_REQUIRED if settings.LDAP_TLS_VALIDATE else ssl.CERT_NONE
        tls = Tls(
            validate=validate,
            ca_certs_file=settings.LDAP_TLS_CA_CERTS_FILE,
        )
    return Server(settings.LDAP_URL, use_ssl=settings.LDAP_URL.startswith("ldaps://"), tls=tls)


def authenticate(username: str, password: str) -> Optional[LDAPUser]:
    """
    Authenticate a user against Active Directory via LDAP.

    Steps:
    1. Bind as service account to find user DN
    2. Re-bind as the user with supplied password
    3. Fetch group memberships (memberOf)

    Returns LDAPUser on success, None on invalid credentials.
    Raises LDAPAuthError on connection/configuration errors.
    """
    if not settings.LDAP_ENABLED:
        return None

    server = _build_server()

    # ── Step 1: Service account bind to locate the user ──────────────────────
    try:
        svc_conn = Connection(
            server,
            user=settings.LDAP_BIND_DN,
            password=settings.LDAP_BIND_PASSWORD,
            auto_bind=True,
            read_only=True,
        )
    except LDAPException as exc:
        log.error("ldap.service_bind_failed", error=str(exc))
        raise LDAPAuthError(f"LDAP service bind failed: {exc}") from exc

    search_filter = settings.LDAP_USER_FILTER.replace("{username}", username)
    svc_conn.search(
        search_base=settings.LDAP_BASE_DN,
        search_filter=search_filter,
        search_scope=SUBTREE,
        attributes=[
            "dn",
            "sAMAccountName",
            "mail",
            "displayName",
            "memberOf",
            "userPrincipalName",
        ],
    )

    if not svc_conn.entries:
        log.info("ldap.user_not_found", username=username)
        return None

    entry = svc_conn.entries[0]
    user_dn = entry.entry_dn
    email = str(entry.mail.value) if entry.mail else ""
    display_name = str(entry.displayName.value) if entry.displayName else username

    # memberOf may be a list or single value
    raw_groups = entry.memberOf.values if entry.memberOf else []
    groups: list[str] = [str(g) for g in raw_groups]

    svc_conn.unbind()

    # ── Step 2: Bind as the user to verify credentials ────────────────────────
    try:
        user_conn = Connection(
            server,
            user=user_dn,
            password=password,
            auto_bind=True,
            read_only=True,
        )
        user_conn.unbind()
    except LDAPBindError:
        log.info("ldap.invalid_credentials", username=username)
        return None
    except LDAPException as exc:
        log.error("ldap.user_bind_error", username=username, error=str(exc))
        raise LDAPAuthError(f"LDAP user bind error: {exc}") from exc

    return LDAPUser(
        dn=user_dn,
        username=username,
        email=email,
        display_name=display_name,
        groups=groups,
    )


def resolve_role(groups: list[str]) -> str:
    """
    Map LDAP group memberships to the highest applicable WeCast role.
    Priority: admin > moderator > user
    """
    group_set = {g.lower() for g in groups}

    if settings.LDAP_ADMIN_GROUP_DN and settings.LDAP_ADMIN_GROUP_DN.lower() in group_set:
        return "admin"

    if settings.LDAP_MODERATOR_GROUP_DN and settings.LDAP_MODERATOR_GROUP_DN.lower() in group_set:
        return "moderator"

    return "user"
