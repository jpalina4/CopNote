/**
 * Builds the SQL used to search / filter an officer's notebook.
 *
 * This is a PURE function: it only turns a filter object into
 *   { sql, params }
 * and never runs anything. User input NEVER goes into the SQL text itself —
 * every value becomes a "?" placeholder with the value in `params`.
 * This is what protects the app from SQL injection: even a search for
 *   '; DROP TABLE pages; --
 * is treated as plain text to match.
 */
export const buildPageQuery = (officerId, filters = {}) => {
  const { keyword = '', incidentType = '', status = '', fromDate = '', toDate = '' } = filters;

  // Start from a fixed list of conditions and add more as needed.
  const conditions = ['p.officer_id = ?'];
  const params = [officerId];

  const term = keyword.trim();
  if (term) {
    // One "?" per column; the same %term% value is bound to each.
    const columns = ['p.title', 'p.location', 'p.description', 'p.people_involved', 'p.action_taken'];
    // Exact page number ("12") or full serial ("10452-000012") also match.
    // Must stay in step with formatSerial() in pageHelpers.js.
    const serial = "(p.page_number IS NOT NULL AND o.regimental_number || '-' || printf('%06d', p.page_number) = ?)";
    conditions.push(`(${columns.map((c) => `${c} LIKE ?`).join(' OR ')} OR CAST(p.page_number AS TEXT) = ? OR ${serial})`);
    params.push(...columns.map(() => `%${term}%`), term, term.toUpperCase());
  }
  if (incidentType) {
    conditions.push('p.incident_type = ?');
    params.push(incidentType);
  }
  if (status) {
    conditions.push('p.status = ?');
    params.push(status);
  }
  if (fromDate) {
    conditions.push('p.incident_date >= ?');
    params.push(fromDate);
  }
  if (toDate) {
    conditions.push('p.incident_date <= ?');
    params.push(toDate);
  }

  // LEFT JOIN + COUNT gives the photo count for each page in one query.
  // The officers JOIN supplies the regimental number for the serial number.
  // Drafts (no page number yet) sort first, then saved pages newest first.
  const sql = `
    SELECT p.*, o.regimental_number, COUNT(ph.id) AS photo_count
    FROM pages p
    JOIN officers o ON o.id = p.officer_id
    LEFT JOIN photos ph ON ph.page_id = p.id
    WHERE ${conditions.join(' AND ')}
    GROUP BY p.id
    ORDER BY (p.status = 'draft') DESC, p.created_at DESC, p.id DESC`;

  return { sql, params };
};
