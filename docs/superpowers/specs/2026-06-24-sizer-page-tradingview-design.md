# Sizer Page With TradingView Design

## Goal

Create a dedicated localized sizer workspace at `/[locale]/sizer`, starting with `/zh-HK/sizer`, so the position sizing workflow can use a full-size TradingView chart instead of the current small chart popup. The existing dashboard at `/[locale]` remains available for positions and history.

## User Experience

Desktop uses the approved split workspace layout:

- Left panel: position sizing controls, calculation result, and add-position action.
- Right panel: a large real TradingView widget that fills the remaining width and most of the viewport height.

Mobile stacks the experience vertically:

- Symbol and TradingView chart appear first for chart reading.
- Sizing inputs and results appear below for calculation and adding a position.

The page should feel like a working trading tool, not a landing page. It should keep the existing app's restrained dashboard style and avoid decorative layout changes unrelated to the sizing workflow.

## Routing And Navigation

Add a new localized page route:

- `/zh-HK/sizer`
- `/en/sizer`

The existing `/[locale]` dashboard stays intact. Add a clear header navigation entry for the dedicated sizer page. Locale switching should preserve the current route path, so `/zh-HK/sizer` switches to `/en/sizer`.

## TradingView Integration

Use a real TradingView embed/widget on the new sizer page. The widget symbol follows the calculator symbol input.

Symbol normalization rules:

- US symbols such as `AAPL` and `TSLA` are passed as US equity symbols.
- Hong Kong symbols entered as `0700.HK` are converted to the TradingView-compatible Hong Kong format.
- Empty or unsupported symbols should show a neutral empty chart state or default symbol rather than breaking the page.

The initial implementation does not support clicking the TradingView chart to set stop or target prices. Stop and target values remain controlled through the sizing inputs. This is intentional because TradingView embeds do not expose the same direct chart interaction contract as the existing internal `CandleChart`.

## Component Structure

Reuse the existing calculator behavior instead of duplicating sizing logic:

- Extract reusable sizing form/result state from `src/components/Calculator/index.tsx` where practical.
- Keep the current dashboard calculator and its popup chart working.
- Build the new page around shared sizing controls and result rendering.

The new sizer page can have a page-specific shell component for the split layout and TradingView panel.

## Data Flow

The calculator state drives both the sizing result and TradingView symbol:

1. User enters or edits the symbol.
2. The normalized symbol updates the TradingView widget.
3. User enters capital, max loss, buy price, stop, and optional target.
4. Existing `calculatePosition` logic produces sizing result.
5. Add-position action uses the existing `useTrades` flow.

Existing atoms for capital, currency, and full-position percentage continue to apply.

## Error Handling

If TradingView cannot render a symbol, the page should remain usable and the sizing controls should continue working. The chart panel should present a concise empty/error state rather than blocking the calculator.

Sizing validation remains consistent with the current calculator behavior.

## Testing

Add focused coverage for symbol normalization, especially:

- US symbol passthrough.
- Hong Kong `.HK` conversion.
- Empty or malformed input handling.

Run existing unit tests and a production build after implementation. Verify the new page manually in the in-app browser at desktop and mobile widths.
