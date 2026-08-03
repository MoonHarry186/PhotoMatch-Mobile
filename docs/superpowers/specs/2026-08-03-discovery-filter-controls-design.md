# Discovery filter controls design

## Scope

Update only the existing Discovery filter modal controls:

- Move each boolean filter switch to the trailing/right side of its row.
- Replace the nearby-radius chip group with a single native slider.

The existing modal, header, draft/apply behavior, theme support, safe-area handling,
API contract, pagination behavior, persistence, and navigation remain unchanged.

## Current context

The filter UI is rendered by `DiscoveryFilterSheet` in
`src/features/discovery/discovery-filter-sheet.tsx`. It is opened as a React Native
`Modal` with `presentationStyle="pageSheet"`.

The supported filter fields are:

- `serviceIds`
- `minPrice`
- `maxPrice`
- `nearbyOnly`
- `radiusKm`
- `availableOnly`
- `verifiedOnly`

The API accepts `radiusKm` only when `nearbyOnly` is enabled. The existing allowed
radius values are 5, 10, 20, 30, 50, and 100 km, with 20 km as the default.

## Design

### Toggle rows

`FilterSwitch` keeps the icon, title, and supporting description in a flexible left
column and renders the native `Switch` as the trailing control. The entire row remains
pressable and toggles the same local draft value. The native switch retains
`accessibilityRole="switch"` and a checked state.

### Radius slider

Use `@react-native-community/slider`, installed through the Expo-compatible package
workflow. Configure it as a single-thumb slider with:

- minimum: 5
- maximum: 100
- step: 5
- value: `draft.radiusKm`
- active track and thumb: PhotoMatch brand color
- inactive track: theme border/surface variant

The section header shows the current value as `${radiusKm} km`. `onValueChange` updates
only `draft.radiusKm`; it does not call the API or reset Discovery. The slider exposes
an accessibility label and value through the existing section context.

The current radius chip options are removed from the UI, but the schema and query
parameter remain unchanged. Values outside the slider's visual range can still be
validated by the existing `discoveryFiltersSchema` if supplied by persisted state.

## Data flow

Opening the modal still copies the applied store values into local draft state. Closing
the modal discards unsubmitted changes. Reset clears the draft back to
`defaultDiscoveryFilters` without applying it. Applying validates the draft and invokes
the existing `onApply` callback exactly once.

The parent continues to cancel the current Discovery query and update the persisted
Zustand filter store. The React Query key includes the serialized filters, so applying
the new filter starts the infinite query from its first page without changing the
endpoint or payload mapping.

## Safe area and theme

No layout structure changes are needed. The modal continues to use the existing safe
area edges, keyboard-avoiding container, scrollable content, and fixed footer. The
slider and switch colors use the resolved light/dark palette and existing PhotoMatch
tokens (`brand`, `border`, `surfaceVariant`, `text`, and `muted`).

## Testing

Add focused tests for:

1. The radius slider renders the current radius and updates the draft without invoking
   `onApply`.
2. Applying after moving the slider passes the selected `radiusKm` to `onApply`.
3. Boolean filter rows expose their switch on the trailing side through layout styles
   and preserve the existing toggle behavior.

Run the focused Discovery filter tests, the full Jest suite, typecheck, lint, format
check, and Expo export.
