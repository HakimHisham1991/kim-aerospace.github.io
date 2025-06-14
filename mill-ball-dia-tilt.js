document.addEventListener('DOMContentLoaded', function() {
    const calculateBtn = document.getElementById('calculate-btn');
    const deffInput = document.getElementById('deff');
    const dInput = document.getElementById('d');
    const apInput = document.getElementById('ap');
    const betaInput = document.getElementById('beta');
    const calcDeffRadio = document.getElementById('calc-deff');
    const calcDRadio = document.getElementById('calc-d');
    const calcApRadio = document.getElementById('calc-ap');
    const calcBetaRadio = document.getElementById('calc-beta');
    const resultDiv = document.createElement('div');
    resultDiv.className = 'result-message';
    document.querySelector('.calculator-content').appendChild(resultDiv);

    // Add onclick event to auto-highlight content
    [deffInput, dInput, apInput, betaInput].forEach(input => {
        input.onclick = function() {
            this.select();
        };
    });

    function updateInputStates() {
        if (calcDeffRadio.checked) {
            deffInput.disabled = true;
            dInput.disabled = false;
            apInput.disabled = false;
            betaInput.disabled = false;
        } else if (calcDRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = true;
            apInput.disabled = false;
            betaInput.disabled = false;
        } else if (calcApRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = false;
            apInput.disabled = true;
            betaInput.disabled = false;
        } else if (calcBetaRadio.checked) {
            deffInput.disabled = false;
            dInput.disabled = false;
            apInput.disabled = false;
            betaInput.disabled = true;
        }
        deffInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        apInput.style.backgroundColor = '';
        betaInput.style.backgroundColor = '';
        resultDiv.textContent = '';
    }

    calculateBtn.addEventListener('click', calculate);
    [calcDeffRadio, calcDRadio, calcApRadio, calcBetaRadio].forEach(radio => {
        radio.addEventListener('change', updateInputStates);
    });
    updateInputStates();

    [deffInput, dInput, apInput, betaInput].forEach(input => {
        input.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                calculate();
            }
        });
    });

    function calculate() {
        resultDiv.textContent = '';
        deffInput.style.backgroundColor = '';
        dInput.style.backgroundColor = '';
        apInput.style.backgroundColor = '';
        betaInput.style.backgroundColor = '';

        const deff = parseFloat(deffInput.value.replace(/,/g, '')) || 0;
        const d = parseFloat(dInput.value.replace(/,/g, '')) || 0;
        const ap = parseFloat(apInput.value.replace(/,/g, '')) || 0;
        const beta = parseFloat(betaInput.value.replace(/,/g, '')) || 0;

        if (!calcDeffRadio.checked && deffInput.disabled === false && deff <= 0) {
            showError('All values must be positive numbers', deffInput);
            return;
        }
        if (!calcDRadio.checked && dInput.disabled === false && d <= 0) {
            showError('All values must be positive numbers', dInput);
            return;
        }
        if (!calcApRadio.checked && apInput.disabled === false && ap <= 0) {
            showError('All values must be positive numbers', apInput);
            return;
        }
        if (!calcBetaRadio.checked && betaInput.disabled === false && (beta < 0 || beta > 90)) {
            showError('β must be between 0 and 90 degrees', betaInput);
            return;
        }
        if (!calcApRadio.checked && !calcDRadio.checked && ap > d / 2) {
            showError('ap must be ≤ d/2 for valid results', apInput);
            return;
        }
        if (!calcDeffRadio.checked && !calcDRadio.checked && deff > d) {
            showError('Deff must be ≤ d for valid results', deffInput);
            return;
        }

        if (calcDeffRadio.checked) {
            const arg = 1 - (2 * ap) / d;
            if (arg < -1 || arg > 1) {
                showError('Invalid arccos argument', apInput);
                return;
            }
            // Special case for beta = 0
            let calculatedDeff;
            if (beta === 0) {
                calculatedDeff = 2 * Math.sqrt(ap * (d - ap)); // Geometric solution for beta = 0
            } else {
                calculatedDeff = d * Math.sin(beta * Math.PI / 180 + Math.acos(arg));
            }
            if (isNaN(calculatedDeff) || calculatedDeff <= 0) {
                showError('Invalid calculation: resulting Deff is not positive', deffInput);
                return;
            }
            if (calculatedDeff > d) {
                showError('Deff must be ≤ d for valid results', deffInput);
                return;
            }
            deffInput.value = calculatedDeff.toFixed(3);
        } else if (calcDRadio.checked) {
            // Iterative solution for d
            function calculateD(targetDeff, initialD, maxIterations = 100, tolerance = 0.0001) {
                let dCurrent = initialD;
                for (let i = 0; i < maxIterations; i++) {
                    const arg = 1 - (2 * ap) / dCurrent;
                    if (arg < -1 || arg > 1) break;
                    const calculatedDeff = dCurrent * Math.sin(beta * Math.PI / 180 + Math.acos(arg));
                    const error = Math.abs(calculatedDeff - targetDeff);
                    if (error < tolerance) return dCurrent;
                    dCurrent = dCurrent * (targetDeff / calculatedDeff); // Newton-like adjustment
                }
                return NaN;
            }
            const calculatedD = calculateD(deff, d || deff, 100, 0.0001);
            if (isNaN(calculatedD) || calculatedD <= 0) {
                showError('No valid d found (iteration failed)', dInput);
                return;
            }
            if (calculatedD < deff) {
                showError('d must be ≥ Deff for valid results', dInput);
                return;
            }
            if (ap > calculatedD / 2) {
                showError('ap must be ≤ d/2 for valid results', apInput);
                return;
            }
            dInput.value = calculatedD.toFixed(3);
        } else if (calcApRadio.checked) {
            // Analytical solution for ap
            function calculateAp(targetDeff, dVal, betaVal) {
                const betaRad = betaVal * Math.PI / 180;
                const deffRatio = targetDeff / dVal;
                if (deffRatio > 1 || deffRatio < 0) return NaN; // Invalid ratio
                const term = Math.sqrt(1 - deffRatio * deffRatio) * Math.cos(betaRad) + deffRatio * Math.sin(betaRad);
                const ap = (dVal / 2) * (1 - term);
                return ap > 0 && ap <= dVal / 2 ? ap : NaN;
            }
            const calculatedAp = calculateAp(deff, d, beta);
            if (isNaN(calculatedAp) || calculatedAp <= 0) {
                showError('No valid ap exists for these parameters', apInput);
                return;
            }
            apInput.value = calculatedAp.toFixed(3);
        } else if (calcBetaRadio.checked) {
            const arg = 1 - (2 * ap) / d;
            if (arg < -1 || arg > 1) {
                showError('Invalid arccos argument', apInput);
                return;
            }
            const calculatedBeta = Math.asin(deff / d) - Math.acos(arg);
            if (isNaN(calculatedBeta) || calculatedBeta < 0 || calculatedBeta > Math.PI / 2) {
                showError('No valid β exists for these parameters', betaInput);
                return;
            }
            betaInput.value = (calculatedBeta * 180 / Math.PI).toFixed(3);
        }
    }

    function showError(message, inputElement) {
        resultDiv.textContent = message;
        resultDiv.style.color = 'red';
        if (inputElement) {
            inputElement.style.backgroundColor = '#e84855';
        }
    }

    function showResult(message) {
        resultDiv.textContent = message;
        resultDiv.style.color = '#0066cc';
    }
});