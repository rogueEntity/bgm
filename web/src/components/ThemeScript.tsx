// web/src/components/ThemeScript.tsx

export default function ThemeScript() {
    const script = `
(function () {
  try {
    var storedTheme = localStorage.getItem("theme");
    var systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    var shouldUseDark = storedTheme === "dark" || (!storedTheme && systemPrefersDark);

    document.documentElement.classList.toggle("dark", shouldUseDark);
    document.documentElement.style.colorScheme = shouldUseDark ? "dark" : "light";
  } catch (error) {
    // localStorage 접근이 막힌 환경에서도 화면 렌더링은 계속 진행
  }
})();
`;

    return <script dangerouslySetInnerHTML={{ __html: script }} />;
}