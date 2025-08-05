// converter.js
function convertMmToInch() {
  const mm = parseFloat(document.getElementById("mmInput").value);
  const inches = mm / 25.4;
  document.getElementById("inchResult").textContent = `Result: ${inches.toFixed(4)} inches`;
}

function convertInchToMm() {
  const inches = parseFloat(document.getElementById("inchInput").value);
  const mm = inches * 25.4;
  document.getElementById("mmResult").textContent = `Result: ${mm.toFixed(2)} mm`;
}
