/* Renders the Mermaid diagrams in FLICKED's palette: surfaces for nodes,
   hairlines for edges, orange only where something needs pointing at.

   A classic script on purpose, not a module: browsers refuse module scripts
   over file://, and these docs should work opened straight from disk. */

mermaid.initialize({
  startOnLoad: false,
  theme: "base",
  securityLevel: "strict",
  fontFamily: "Inter, system-ui, sans-serif",
  themeVariables: {
    darkMode: true,
    fontSize: "13px",
    background: "#131315",
    primaryColor: "#1c1c20",
    primaryTextColor: "#ffffff",
    primaryBorderColor: "#3a3a40",
    secondaryColor: "#19191c",
    secondaryTextColor: "#b4b4b8",
    secondaryBorderColor: "#2e2e33",
    tertiaryColor: "#161618",
    tertiaryTextColor: "#b4b4b8",
    tertiaryBorderColor: "#2a2a2e",
    lineColor: "#6a6a72",
    textColor: "#b4b4b8",
    mainBkg: "#1c1c20",
    nodeBorder: "#3a3a40",
    clusterBkg: "#161618",
    clusterBorder: "#2a2a2e",
    titleColor: "#8d8d93",
    edgeLabelBackground: "#131315",
    // sequence diagrams
    actorBkg: "#1c1c20",
    actorBorder: "#f65600",
    actorTextColor: "#ffffff",
    actorLineColor: "#3a3a40",
    signalColor: "#8d8d93",
    signalTextColor: "#d6d6da",
    labelBoxBkgColor: "#1c1c20",
    labelBoxBorderColor: "#3a3a40",
    labelTextColor: "#ffffff",
    loopTextColor: "#b4b4b8",
    noteBkgColor: "#22170f",
    noteBorderColor: "#7a3510",
    noteTextColor: "#ffd9c4",
    activationBkgColor: "#2a2a2e",
    activationBorderColor: "#4a4a50",
    sequenceNumberColor: "#0c0c0d",
    // state diagrams
    labelColor: "#d6d6da",
    altBackground: "#161618",
    compositeBackground: "#161618",
    // er diagrams
    attributeBackgroundColorOdd: "#161618",
    attributeBackgroundColorEven: "#1a1a1d",
  },
  flowchart: { curve: "basis", padding: 14, htmlLabels: true },
  sequence: { mirrorActors: false, actorMargin: 60, messageMargin: 38, boxMargin: 8 },
  er: { useMaxWidth: true },
});

mermaid.run({ querySelector: ".mermaid" });
