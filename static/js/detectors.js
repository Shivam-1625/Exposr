"use strict";

function detectBrowserSignals() {
    const findings = [];

    function addFinding(id, value) {
        findings.push({
            id,
            source: "browser_api",
            status: value === null ? "unavailable" : "available", value
        });
    }

    try {
        addFinding(
            "browser_language",
            typeof navigator.language === "string" ? navigator.language : null
        );
    } catch {
        addFinding("browser_language", null);
    }

    try {
        addFinding(
            "browser_timezone",
            Intl.DateTimeFormat().resolvedOptions().timeZone || null
        );
    } catch {
        addFinding("browser_timezone", null);
    }

    try {
        addFinding(
            "screen_dimensions",
            Number.isFinite(screen.width) && Number.isFinite(screen.height) ? `${screen.width} × ${screen.height}` : null
        );
    } catch {
        addFinding("screen_dimensions", null);
    }

    try {
        addFinding(
            "viewport_dimensions",
            Number.isFinite(window.innerWidth) && Number.isFinite(window.innerHeight) ? `${window.innerWidth} × ${window.innerHeight}` : null
        );
    } catch {
        addFinding("viewport_dimensions", null);
    }

    try {
        addFinding(
            "device_pixel_ratio",
            Number.isFinite(window.devicePixelRatio) ? window.devicePixelRatio : null
        );
    } catch {
        addFinding("device_pixel_ratio", null);
    }

    try {
        addFinding(
            "browser_platform",
            typeof navigator.platform === "string" && navigator.platform !== "" ? navigator.platform : null
        );
    } catch {
        addFinding("browser_platform", null);
    }

    try {
        addFinding(
            "browser_user_agent",
            typeof navigator.userAgent === "string" &&
            navigator.userAgent !== ""
                ? navigator.userAgent
                : null
        );
    } catch {
        addFinding("browser_user_agent", null);
    }

    return findings;
}
