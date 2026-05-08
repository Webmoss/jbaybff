## 2025-05-22 - [Password Visibility Toggle Pattern]
**Learning:** Adding a password visibility toggle improves accessibility and UX for login forms. When implementing this, ensure the toggle button has dynamic ARIA labels, is not a submit button, and the input has enough right padding to avoid text overlap with the icon.
**Action:** Use a relative container for password inputs and absolute positioning for the toggle icon. Always verify that the button doesn't trigger form submission by setting its type to "button".
