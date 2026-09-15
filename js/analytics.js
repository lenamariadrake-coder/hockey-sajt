(function () {
    "use strict";

    /*
     * Avbytarnas avbytarbänk
     * Samtyckeshantering för besöksstatistik.
     */

    const CONSENT_KEY = "avbytarbank_analytics_consent";
    const PRIVACY_PAGE = "/kakor-och-statistik.html";
    const GA_MEASUREMENT_ID = "G-S407P71TGY";
    const PRODUCTION_HOST =
        "avbytarnas-avbytarbank.netlify.app";

    const IS_PRODUCTION =
        window.location.hostname === PRODUCTION_HOST;

    let analyticsLoaded = false;

    /*
     * Hämta tidigare val.
     * Möjliga värden:
     *   "granted"
     *   "denied"
     *   null
     */
    function getConsent() {
        return localStorage.getItem(CONSENT_KEY);
    }

    /*
     * Spara val.
     */
    function setConsent(value) {
        localStorage.setItem(CONSENT_KEY, value);
    }

    /*
     * Ta bort Google Analytics-kakor som ligger på den aktuella domänen.
     * Detta används när besökaren går från ja till nej.
     */
    function deleteAnalyticsCookies() {
        document.cookie.split(";").forEach(function (cookie) {
            const name = cookie.split("=")[0].trim();

            if (name === "_ga" || name.indexOf("_ga_") === 0) {
                document.cookie =
                    name +
                    "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
            }
        });
    }

    /*
     * Stoppa fortsatt Analytics-mätning på den aktuella sidan.
     *
     * Ett redan inläst script kan inte tas bort på ett meningsfullt sätt,
     * men Googles ga-disable-flagga stoppar fortsatta träffar för detta
     * mät-ID. Vid nästa sidladdning laddas Analytics inte alls eftersom
     * samtycket då är "denied".
     */
    function disableGoogleAnalytics() {
        window["ga-disable-" + GA_MEASUREMENT_ID] = true;
        deleteAnalyticsCookies();
    }

    /*
     * Tillåt Analytics igen efter ett nytt ja.
     */
    function enableGoogleAnalytics() {
        window["ga-disable-" + GA_MEASUREMENT_ID] = false;
    }

    /*
     * Ladda Google Analytics.
     *
     * Den här funktionen anropas ENDAST när besökaren
     * har godkänt statistik.
     */
    function loadGoogleAnalytics() {
        if (!IS_PRODUCTION) {
            return;
        }

        if (analyticsLoaded) {
            return;
        }

        analyticsLoaded = true;
        enableGoogleAnalytics();

        window.dataLayer = window.dataLayer || [];

        window.gtag = function () {
            window.dataLayer.push(arguments);
        };

        window.gtag("js", new Date());
        window.gtag("config", GA_MEASUREMENT_ID);

        const script = document.createElement("script");

        script.async = true;
        script.src =
            "https://www.googletagmanager.com/gtag/js?id=" +
            encodeURIComponent(GA_MEASUREMENT_ID);

        document.head.appendChild(script);
    }

    /*
     * Skapa CSS för bannern och den permanenta länken.
     */
    function addStyles() {
        if (document.getElementById("avbytarbank-analytics-styles")) {
            return;
        }

        const style = document.createElement("style");
        style.id = "avbytarbank-analytics-styles";

        style.textContent = `
            .avbytarbank-cookie-banner {
                position: fixed;
                left: 1rem;
                right: 1rem;
                bottom: 1rem;
                z-index: 10000;

                max-width: 680px;
                margin: 0 auto;
                padding: 1rem 1.1rem;

                box-sizing: border-box;

                background: #ffffff;
                color: #0f172a;

                border: 1px solid rgba(15, 23, 42, 0.12);
                border-radius: 12px;

                box-shadow:
                    0 12px 35px rgba(15, 23, 42, 0.18);

                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    "Segoe UI",
                    Roboto,
                    Arial,
                    sans-serif;

                line-height: 1.45;
            }

            .avbytarbank-cookie-banner h2 {
                margin: 0 0 0.55rem 0;
                font-size: 1.15rem;
            }

            .avbytarbank-cookie-banner p {
                margin: 0 0 0.8rem 0;
            }

            .avbytarbank-cookie-actions {
                display: flex;
                flex-wrap: wrap;
                gap: 0.5rem;
                margin-top: 0.9rem;
            }

            .avbytarbank-cookie-button {
                display: inline-flex;
                align-items: center;

                padding: 0.48rem 0.85rem;

                border-radius: 999px;
                border: 1px solid rgba(11, 110, 253, 0.18);

                background: rgba(11, 110, 253, 0.07);
                color: #0b6efd;

                font: inherit;
                font-size: 0.95rem;

                cursor: pointer;
            }

            .avbytarbank-cookie-button:hover,
            .avbytarbank-cookie-button:focus {
                background: rgba(11, 110, 253, 0.14);
                outline: none;
            }

            .avbytarbank-cookie-button:focus-visible {
                box-shadow:
                    0 0 0 3px rgba(11, 110, 253, 0.15);
            }

            .avbytarbank-cookie-more {
                display: inline-block;
                color: #0b6efd;
                text-decoration: underline;
                text-underline-offset: 2px;
            }

            .avbytarbank-cookie-settings {
                position: fixed;
                right: 0.75rem;
                bottom: 0.65rem;
                z-index: 9990;

                padding: 0.3rem 0.55rem;

                background: rgba(255, 255, 255, 0.92);
                color: #6b7280;

                border: 1px solid rgba(15, 23, 42, 0.08);
                border-radius: 999px;

                font-family:
                    Inter,
                    system-ui,
                    -apple-system,
                    "Segoe UI",
                    Roboto,
                    Arial,
                    sans-serif;

                font-size: 0.78rem;
                text-decoration: none;

                box-shadow:
                    0 2px 8px rgba(15, 23, 42, 0.06);
            }

            .avbytarbank-cookie-settings:hover,
            .avbytarbank-cookie-settings:focus {
                color: #0b6efd;
            }

            @media (max-width: 640px) {
                .avbytarbank-cookie-banner {
                    left: 0.65rem;
                    right: 0.65rem;
                    bottom: 0.65rem;
                }

                .avbytarbank-cookie-actions {
                    align-items: stretch;
                }
            }
        `;

        document.head.appendChild(style);
    }

    /*
     * Ta bort bannern om den finns.
     */
    function removeBanner() {
        const banner =
            document.getElementById("avbytarbank-cookie-banner");

        if (banner) {
            banner.remove();
        }
    }

    /*
     * Visa bannern.
     */
    function showBanner() {
        removeBanner();

        const banner = document.createElement("section");

        banner.id = "avbytarbank-cookie-banner";
        banner.className = "avbytarbank-cookie-banner";
        banner.setAttribute("role", "dialog");
        banner.setAttribute(
            "aria-labelledby",
            "avbytarbank-cookie-title"
        );

        banner.innerHTML = `
            <h2 id="avbytarbank-cookie-title">
                🏒 Är det någon på läktaren?
            </h2>

            <p>
                Jag använder frivillig besöksstatistik för att försöka
                ta reda på om någon annan än jag själv faktiskt hänger
                här på Avbytarnas avbytarbänk.
            </p>

            <p>
                Du är precis lika välkommen även om du tackar nej –
                då får jag helt enkelt fortsätta undra vem som sitter
                där uppe på läktaren. 😄
            </p>

            <a
                class="avbytarbank-cookie-more"
                href="${PRIVACY_PAGE}">
                Läs mer om kakor och statistik
            </a>

            <div class="avbytarbank-cookie-actions">
                <button
                    type="button"
                    class="avbytarbank-cookie-button"
                    data-cookie-choice="granted">
                    Tillåt statistik
                </button>

                <button
                    type="button"
                    class="avbytarbank-cookie-button"
                    data-cookie-choice="denied">
                    Nej tack
                </button>
            </div>
        `;

        banner
            .querySelectorAll("[data-cookie-choice]")
            .forEach(function (button) {

                button.addEventListener("click", function () {

                    const choice =
                        button.dataset.cookieChoice;

                    setConsent(choice);
                    removeBanner();

                    if (choice === "granted") {
                        enableGoogleAnalytics();
                        loadGoogleAnalytics();
                    } else {
                        disableGoogleAnalytics();
                    }
                });
            });

        document.body.appendChild(banner);
    }

    /*
     * Permanent liten länk på alla sidor.
     */
    function addSettingsLink() {
        if (
            document.querySelector(
                ".avbytarbank-cookie-settings"
            )
        ) {
            return;
        }

        const link = document.createElement("a");

        link.className =
            "avbytarbank-cookie-settings";

        link.href = PRIVACY_PAGE;
        link.textContent = "Kakor och statistik";

        document.body.appendChild(link);
    }

    /*
     * Funktioner som informationssidan kan använda.
     */
    window.avbytarbankCookieSettings = {
        getConsent: getConsent,

        changeConsent: function () {
            showBanner();
        }
    };

    /*
     * Start.
     */
    function init() {
        addStyles();
        addSettingsLink();

        const consent = getConsent();

        if (consent === "granted") {
            loadGoogleAnalytics();
            return;
        }

        if (consent === "denied") {
            disableGoogleAnalytics();
            return;
        }

        showBanner();
    }

    init();

})();