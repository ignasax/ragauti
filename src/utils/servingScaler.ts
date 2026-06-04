export function scaleIngredients(text: string, multiplier: number): string {
  if (multiplier === 1) return text
  return text.split('\n').map(line => scaleLine(line, multiplier)).join('\n')
}

function scaleLine(line: string, multiplier: number): string {
  // Handle fractions first (e.g. 1/2); if matched, skip integer/decimal pass
  const fractionResult = line.replace(/\b(\d+)\/(\d+)\b/, (_m, n, d) =>
    formatNumber((parseInt(n) / parseInt(d)) * multiplier)
  )
  if (fractionResult !== line) return fractionResult

  // Handle integers and decimals; adjust plurality of the following word when
  // the original value was exactly 1 and the result is not 1 (or vice versa).
  return line.replace(/\b(\d+(?:\.\d+)?)\b(\s+[a-zA-Z]+)?/, (_m, n, wordPart) => {
    const original = parseFloat(n)
    const scaled = formatNumber(original * multiplier)
    const scaledNum = original * multiplier

    if (!wordPart) return scaled

    const word = wordPart.trimStart()
    const space = wordPart.match(/^\s+/)?.[0] ?? ' '
    const adjustedWord = adjustPlurality(word, original, scaledNum)
    return scaled + space + adjustedWord
  })
}

/** Best-effort: pluralize or singularize a unit word based on old vs new quantity. */
function adjustPlurality(word: string, originalQty: number, scaledQty: number): string {
  const wasPlural = originalQty !== 1
  const isPlural = scaledQty !== 1

  if (wasPlural === isPlural) return word

  if (!wasPlural && isPlural) {
    // singlar → plural: append 's' unless word already ends in 's'
    if (!word.endsWith('s')) return word + 's'
  }
  if (wasPlural && !isPlural) {
    // plural → singular: strip trailing 's' for simple cases
    if (word.endsWith('s') && word.length > 1) return word.slice(0, -1)
  }
  return word
}

function formatNumber(n: number): string {
  if (Number.isInteger(n)) return String(n)
  return String(Math.round(n * 100) / 100)
}
