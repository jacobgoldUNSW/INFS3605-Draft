// 4-way BFS on the café's walk grid (30 x 17 tiles is tiny, so BFS is instant).
export function makeGrid(walkRows) {
  const rows = walkRows.length
  const cols = walkRows[0].length
  const open = walkRows.map((r) => [...r].map((ch) => ch === '1'))
  const inside = (c, r) => c >= 0 && r >= 0 && c < cols && r < rows
  const walkable = (c, r) => inside(c, r) && open[r][c]

  function path(from, to) {
    const [fc, fr] = from
    const [tc, tr] = to
    if (fc === tc && fr === tr) return [[tc, tr]]
    const key = (c, r) => r * cols + c
    const prev = new Map()
    const start = key(fc, fr)
    prev.set(start, -1)
    const q = [[fc, fr]]
    let head = 0
    // allow starting from (or ending on) a blocked tile, e.g. a chair seat or a counter-side spot
    while (head < q.length) {
      const [c, r] = q[head++]
      if (c === tc && r === tr) break
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc
        const nr = r + dr
        if (!inside(nc, nr)) continue
        const k = key(nc, nr)
        if (prev.has(k)) continue
        if (!open[nr][nc] && !(nc === tc && nr === tr)) continue
        prev.set(k, key(c, r))
        q.push([nc, nr])
      }
    }
    const end = key(tc, tr)
    if (!prev.has(end)) return null
    const out = []
    for (let k = end; k !== -1; k = prev.get(k)) out.push([k % cols, Math.floor(k / cols)])
    return out.reverse()
  }

  return { rows, cols, walkable, path }
}
