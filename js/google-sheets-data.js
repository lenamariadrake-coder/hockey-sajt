/* ===========================================================
   Google Sheets-data – gemensam hjälpare
   -----------------------------------------------------------
   Ansvar:
   - Bygger GViz/CSV-adress från spreadsheetId + gid.
   - Försöker GViz först.
   - Validerar att rätt kolumner faktiskt finns.
   - Faller tillbaka till publicerad TSV om GViz misslyckas
     eller returnerar fel datainnehåll.
   - Håller CSV- och TSV-parsning separata.
   - Loggar tydligt vilken källa som användes.

   Ansvarar INTE för cache, localStorage, liga/säsong eller
   sidspecifik datalogik. Det styrs fortsatt av respektive sida.
   =========================================================== */

(function (global) {
    'use strict';

    function parseTSV(text) {
        return String(text || '')
            .split(/\r?\n/)
            .filter(line => line.trim().length > 0)
            .map(line => line.split('\t').map(cell => cell.trim()));
    }

    function parseCSV(text) {
        const rows = [];
        let row = [];
        let cell = '';
        let inQuotes = false;

        const input = String(text || '');

        for (let i = 0; i < input.length; i++) {
            const ch = input[i];
            const next = input[i + 1];

            if (ch === '"') {
                if (inQuotes && next === '"') {
                    cell += '"';
                    i++;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (ch === ',' && !inQuotes) {
                row.push(cell.trim());
                cell = '';
            } else if ((ch === '\n' || ch === '\r') && !inQuotes) {
                if (ch === '\r' && next === '\n') i++;

                row.push(cell.trim());
                cell = '';

                if (row.some(value => value !== '')) {
                    rows.push(row);
                }

                row = [];
            } else {
                cell += ch;
            }
        }

        row.push(cell.trim());

        if (row.some(value => value !== '')) {
            rows.push(row);
        }

        return rows;
    }

    async function fetchText(url, label, timeoutMs = 10000) {
        if (!url) throw new Error(`${label}: URL saknas.`);

        const controller = new AbortController();
        const timeoutId = setTimeout(() => {
            controller.abort(new DOMException(`${label}: hämtningen tog för lång tid.`, 'TimeoutError'));
        }, timeoutMs);

        try {
            const response = await fetch(url, { signal: controller.signal });
            if (!response.ok) throw new Error(`${label}: HTTP ${response.status}.`);
            return await response.text();
        } catch (error) {
            if (error?.name === 'AbortError' || error?.name === 'TimeoutError') {
                throw new Error(`${label}: hämtningen tog längre än ${Math.round(timeoutMs / 1000)} sekunder.`);
            }
            throw error;
        } finally {
            clearTimeout(timeoutId);
        }
    }

    function assertRequiredColumns(rows, requiredColumns, label) {
        if (!rows.length) throw new Error(`${label}: inga rader hittades.`);

        const headers = rows[0].map(h => String(h || '').trim().toLowerCase());
        const missing = (requiredColumns || [])
            .filter(name => !headers.includes(String(name).toLowerCase()));

        if (missing.length) {
            throw new Error(`${label}: fel datainnehåll; saknar kolumn(er): ${missing.join(', ')}.`);
        }
    }

    function buildGvizUrl(source) {
        if (source?.gviz) return source.gviz;

        if (!source?.spreadsheetId) {
            throw new Error(`${source?.label || 'Datakälla'}: spreadsheetId saknas.`);
        }

        if (source?.gid === undefined || source?.gid === null || source?.gid === '') {
            throw new Error(`${source?.label || 'Datakälla'}: gid saknas.`);
        }

        const spreadsheetId = encodeURIComponent(String(source.spreadsheetId).trim());
        const gid = encodeURIComponent(String(source.gid).trim());

        return `https://docs.google.com/spreadsheets/d/${spreadsheetId}/gviz/tq?tqx=out:csv&gid=${gid}`;
    }

    async function fetchRows(source, options = {}) {
        const key = options.key || source?.key || 'sheet';
        const label = source?.label || key;
        const requiredColumns = options.requiredColumns || source?.requiredColumns || [];
        const timeoutMs = options.timeoutMs || source?.timeoutMs || 10000;
        const gvizUrl = buildGvizUrl(source);

        try {
            console.info(`[data][${key}] Försöker GViz först...`, gvizUrl);

            const text = await fetchText(gvizUrl, `${label} via GViz`, timeoutMs);
            const rows = parseCSV(text);

            assertRequiredColumns(rows, requiredColumns, `${label} via GViz`);

            console.info(`[data][${key}] GViz OK (${rows.length} rader, rätt kolumner).`);
            return { rows, source: 'gviz' };
        } catch (gvizError) {
            console.warn(
                `[data][${key}] GViz misslyckades/ogiltig data -> testar TSV.`,
                gvizError
            );

            if (!source?.tsv) {
                throw new Error(
                    `${label}: GViz misslyckades och TSV-fallback saknas. ` +
                    `${gvizError?.message || gvizError}`
                );
            }

            const text = await fetchText(
                source.tsv,
                `${label} via TSV-fallback`,
                timeoutMs
            );
            const rows = parseTSV(text);

            assertRequiredColumns(rows, requiredColumns, `${label} via TSV-fallback`);

            console.info(`[data][${key}] TSV OK (${rows.length} rader, rätt kolumner).`);
            return { rows, source: 'tsv' };
        }
    }

    global.GoogleSheetsData = Object.freeze({
        fetchRows,
        buildGvizUrl,
        parseCSV,
        parseTSV
    });

})(window);
