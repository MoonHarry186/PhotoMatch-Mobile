# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

## Interactive gradient buttons

For a gradient button, prefer `LinearGradient` as the visual shell and put a
full-size `Pressable` inside it. Keep `Pressable` responsible for hit testing,
accessibility, and pressed/disabled state. Put visual styles (`width`,
`height`, `borderRadius`, `overflow`, border, shadow, and flex sizing) on the
`LinearGradient`; make the inner `Pressable` use `width: '100%'` and
`height: '100%'`. Keep the visual shell `flexShrink: 0` when it sits beside a
flexible input, and verify the target screen after reloading the Expo bundle.

## Icon controls

Every visible icon control must have a real, testable action. Do not leave an
interactive icon with a no-op handler such as `onPress={() => undefined}`. If
the action is unavailable, disable the control with an accessible state and
clear visual feedback; if it is available, wire the handler to the expected
toggle, picker, navigation, or mutation behavior.
