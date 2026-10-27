
"use strict";

const scanButton = document.getElementById("start-scan");
const reportStatus = document.getElementById("report-status");
const reportLayout = document.getElementById("report-layout");
const reportEmpty = document.getElementById("report-empty");
const findingsGrid = document.getElementById("findings-grid");
const findingsCount = document.getElementById("findings-count");

const detailSidebar = document.getElementById("detail-sidebar");
const closeSidebarButton = document.getElementById("close-sidebar");

const detailCategory = document.getElementById("detail-category");
const detailTitle = document.getElementById("detail-title");
const detailShortDescription = document.getElementById(
    "detail-short-description"
);
const detailValue = document.getElementById("detail-value");
const detailSource = document.getElementById("detail-source");
const detailDescription = document.getElementById("detail-description");
const detailMisuse = document.getElementById("detail-misuse");
const detailLimitations = document.getElementById("detail-limitations");
const detailProtection = document.getElementById("detail-protection");

let explanations = null;
let findings = [];
let selectedFindingId = null;


/* Load the explanation knowledge base from Flask. */

async function loadExplanations() {
    const response = await fetch("/api/explanations");

    if (!response.ok) {
        throw new Error("Could not load explanations.");
    }

    return response.json();
}


/* Safely display text without interpreting it as HTML. */

function setText(element, value) {
    element.textContent = value ?? "";
}


function formatValue(value) {
    if (
        value === null ||
        value === undefined ||
        value === ""
    ) {
        return "Unavailable";
    }

    if (typeof value === "object") {
        return JSON.stringify(value);
    }

    return String(value);
}

/* Identify the likely browser from its User-Agent string. */

function identifyBrowser(userAgent) {
    if (typeof userAgent !== "string" || !userAgent) {
        return {
            name: "Unknown browser",
            version: null,
            method: "User-Agent unavailable"
        };
    }

    const patterns = [
        {
            name: "Microsoft Edge",
            regex: /Edg\/([\d.]+)/i
        },
        {
            name: "Opera",
            regex: /(?:OPR|Opera)\/([\d.]+)/i
        },
        {
            name: "Firefox",
            regex: /Firefox\/([\d.]+)/i
        },
        {
            name: "Google Chrome",
            regex: /Chrome\/([\d.]+)/i
        },
        {
            name: "Safari",
            regex: /Version\/([\d.]+).*Safari/i
        }
    ];

    for (const browser of patterns) {
        const match = userAgent.match(browser.regex);

        if (match) {
            return {
                name: browser.name,
                version: match[1],
                method: "User-Agent"
            };
        }
    }

    return {
        name: "Unknown browser",
        version: null,
        method: "No matching browser pattern"
    };
}


/* Check Brave's documented browser-specific API when available. */

async function identifyBrowserWithBrave(userAgent) {
    const result = identifyBrowser(userAgent);

    try {
        if (
            navigator.brave &&
            typeof navigator.brave.isBrave === "function"
        ) {
            const isBrave = await navigator.brave.isBrave();

            if (isBrave) {
                return {
                    ...result,
                    name: "Brave",
                    method: "Brave browser API"
                };
            }
        }
    } catch (error) {
        // Fall back to User-Agent identification.
    }

    return result;
}

/* Format the browser card without displaying the entire User-Agent. */

function formatCardValue(finding) {
    if (finding.id !== "browser_user_agent") {
        return formatValue(finding.value);
    }

    if (finding.status !== "available") {
        return "Unavailable";
    }

    const browser = finding.browserIdentity;

    if (!browser) {
        return "Browser identification unavailable";
    }

    if (!browser.version) {
        return browser.name;
    }

    return `${browser.name} · ${browser.version}`;
}

function getExplanation(finding) {
    if (finding.id === "browser_user_agent") {
        return explanations?.browser_identity ?? null;
    }

    return explanations?.[finding.id] ?? null;
}

function getTitle(finding) {
    return (
        getExplanation(finding)?.title ||
        "Explanation unavailable"
    );
}


function getCategory(finding) {
    return (
        getExplanation(finding)?.category ||
        "Browser signal"
    );
}


/* Create one clickable finding card. */

function renderFindingCard(finding) {
    const explanation = getExplanation(finding);
    const isAvailable = finding.status === "available";

    const card = document.createElement("button");
    card.type = "button";
    card.className = "finding-card";
    card.dataset.findingId = finding.id;
    card.setAttribute("aria-pressed", "false");

    const top = document.createElement("div");
    top.className = "finding-card-top";

    const category = document.createElement("span");
    category.className = "finding-card-category";
    category.textContent = getCategory(finding);

    const indicator = document.createElement("span");
    indicator.className = "finding-card-indicator";
    indicator.classList.add(
        isAvailable ? "is-available" : "is-unavailable"
    );
    indicator.setAttribute("aria-hidden", "true");

    top.append(category, indicator);
    card.appendChild(top);

    const title = document.createElement("h3");
    title.className = "finding-card-title";
    title.textContent = getTitle(finding);
    card.appendChild(title);

    const value = document.createElement("p");
    value.className = "finding-card-value";
    value.textContent = formatCardValue(finding);
    card.appendChild(value);

    const description = document.createElement("p");
    description.className = "finding-card-description";
    description.textContent =
        explanation?.short_description ||
        "A browser observation collected during this scan.";
    card.appendChild(description);

    const action = document.createElement("span");
    action.className = "finding-card-action";
    action.textContent = "View details →";
    card.appendChild(action);

    card.addEventListener("click", () => {
        selectFinding(finding.id);
    });

    return card;
}


/* Render all findings into the grid. */

function renderFindings() {
    findingsGrid.replaceChildren();

    findings.forEach((finding) => {
        findingsGrid.appendChild(
            renderFindingCard(finding)
        );
    });

    findingsCount.textContent =
        `${findings.length} ${
            findings.length === 1 ? "finding" : "findings"
        }`;
}


/* Populate the sidebar with the selected finding. */

function showFindingDetails(finding) {
    const explanation = getExplanation(finding);

    setText(detailCategory, getCategory(finding));
    setText(detailTitle, getTitle(finding));

    setText(
        detailShortDescription,
        explanation?.short_description ||
            "A browser observation collected during this scan."
    );

    setText(detailValue, formatValue(finding.value));

    setText(
        detailSource,
        `Source: ${finding.source || "Not specified"} · ` +
        `Status: ${finding.status || "unknown"}`
    );

    if (!explanation) {
        setText(
            detailDescription,
            "This observation does not yet have a detailed explanation in Exposr's knowledge base."
        );

        setText(
            detailMisuse,
            "No explanation is available yet."
        );

        setText(
            detailLimitations,
            "The meaning and limitations of this observation have not been documented yet."
        );

        setText(
            detailProtection,
            "No specific recommendation is available yet."
        );

        return;
    }

    if (finding.status !== "available") {
        setText(
            detailDescription,
            "Exposr could not obtain this browser signal in the current environment."
        );

        setText(
            detailMisuse,
            "An unavailable observation does not by itself establish that information is being hidden or that a security problem exists."
        );

        setText(
            detailLimitations,
            explanation.limitations ||
                "The value could not be obtained, so no conclusion should be drawn from it."
        );

        setText(
            detailProtection,
            explanation.protection ||
                "No special action is necessary based only on an unavailable observation."
        );

        return;
    }

    setText(
        detailDescription,
        explanation.description
    );

    setText(
        detailMisuse,
        explanation.misuse
    );

    setText(
        detailLimitations,
        explanation.limitations
    );

    setText(
        detailProtection,
        explanation.protection
    );
}


/* Open the sidebar and make it available to keyboard users. */

function openSidebar() {
    reportLayout.classList.add("sidebar-open");
    detailSidebar.setAttribute("aria-hidden", "false");
    detailSidebar.inert = false;
    if (window.matchMedia("(max-width: 760px)").matches) {
    detailBackdrop.hidden = false;
    }
}


/* Close the sidebar and return focus to the selected card. */

function closeSidebar() {
    reportLayout.classList.remove("sidebar-open");

    detailSidebar.setAttribute("aria-hidden", "true");
    detailSidebar.inert = true;

    
    const selectedCard = Array.from(
        findingsGrid.querySelectorAll(".finding-card")
    ).find(
        (card) => card.dataset.findingId === selectedFindingId
    );

    findingsGrid.querySelectorAll(".finding-card").forEach((card) => {
        card.setAttribute("aria-pressed", "false");
    });

    if (selectedCard) {
        selectedCard.focus();
    }

    detailBackdrop.hidden = true;
    selectedFindingId = null;

}
const detailBackdrop = document.getElementById("detail-backdrop");

detailBackdrop.addEventListener("click", () => {
    if (window.matchMedia("(max-width: 760px)").matches) {
        closeSidebar();
    }
});

document.addEventListener("keydown", (event) => {
    if (
        event.key === "Escape" &&
        reportLayout.classList.contains("sidebar-open")
    ) {
        closeSidebar();
    }
});

/* Select a finding, highlight its card, and open its details. */

function selectFinding(findingId) {
    const finding = findings.find(
        (item) => item.id === findingId
    );

    if (!finding) {
        return;
    }

    selectedFindingId = findingId;

    findingsGrid.querySelectorAll(".finding-card").forEach(
        (card) => {
            card.setAttribute(
                "aria-pressed",
                String(card.dataset.findingId === findingId)
            );
        }
    );

    showFindingDetails(finding);
    openSidebar();
}


/* Run the browser-side inspection. */

async function runScan() {
    scanButton.disabled = true;
    reportStatus.textContent = "Scanning…";

    findingsGrid.replaceChildren();

    reportLayout.hidden = true;
    reportLayout.classList.remove("sidebar-open");

    detailSidebar.setAttribute("aria-hidden", "true");
    detailSidebar.inert = true;

    selectedFindingId = null;
    findings = [];

    reportEmpty.hidden = false;
    reportEmpty.textContent =
        "Collecting browser observations…";

    try {
        
        try {
            explanations = await loadExplanations();
        } catch (error) {
            console.warn(
                "Explanations unavailable; continuing without them:",
                error
            );

            explanations = {};
        }

        if (typeof detectBrowserSignals !== "function") {
            throw new Error(
                "Browser detector function is unavailable."
            );
        }

        
        const browserResults = detectBrowserSignals();

        if (!Array.isArray(browserResults)) {
            throw new Error(
                "Browser detectors did not return a list."
            );
        }

        const userAgentFinding = browserResults.find(
            (finding) => finding.id === "browser_user_agent"
        );

        if (userAgentFinding) {
            userAgentFinding.browserIdentity =
                await identifyBrowserWithBrave(
                    userAgentFinding.value
            );
        }

        
        let ipFinding = {
            id: "ip_address",
            source: "server_connection",
            status: "unavailable",
            value: null
        };

        try {
            const ipResponse = await fetch("/api/ip");

            if (!ipResponse.ok) {
                throw new Error(
                    `IP endpoint returned HTTP ${ipResponse.status}`
                );
            }

            const result = await ipResponse.json();

            const validIpResponse =
                result !== null &&
                typeof result === "object" &&
                !Array.isArray(result) &&
                result.id === "ip_address" &&
                result.source === "server_connection" &&
                ["available", "unavailable"].includes(result.status) &&
                (
                    result.status === "unavailable"
                        ? result.value === null ||
                        result.value === ""
                        : typeof result.value === "string" &&
                        result.value.trim().length > 0
                );

            if (!validIpResponse) {
                throw new Error("IP endpoint returned an invalid response.");
            }

            ipFinding = result;
        } catch (error) {
            console.warn(
                "IP observation unavailable; continuing with browser findings:",
                error
            );
        }

        findings = [
            ipFinding,
            ...browserResults
        ];


        renderFindings();

        const availableCount = findings.filter(
            (finding) => finding.status === "available"
        ).length;

        reportStatus.textContent =
            `${availableCount} of ${findings.length} observations available`;

        reportEmpty.hidden = findings.length > 0;
        reportLayout.hidden = findings.length === 0;

        if (findings.length === 0) {
            reportEmpty.textContent =
                "No observations were returned by the scanner.";
        }
    } catch (error) {
        console.error("Exposr scan failed:", error);

        reportLayout.hidden = true;
        reportEmpty.hidden = false;

        reportEmpty.textContent =
            "Exposr could not complete the scan. Please refresh the page and try again.";

        reportStatus.textContent = "Unable to complete";
    } finally {
        scanButton.disabled = false;
    }
}


/* Connect the user interface controls. */

scanButton.addEventListener("click", runScan);

closeSidebarButton.addEventListener(
    "click",
    closeSidebar
);

runScan();