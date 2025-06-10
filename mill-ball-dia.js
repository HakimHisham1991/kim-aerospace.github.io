document.addEventListener('DOMContentLoaded', function() {
        const calculateBtn = document.getElementById('calculate-btn');
        const deffInput = document.getElementById('deff');
        const adocInput = document.getElementById('adoc');
        const dInput = document.getElementById('d');
        const calcDeffRadio = document.getElementById('calc-deff');
        const calcAdocRadio = document.getElementById('calc-adoc');
        const calcDRadio = document.getElementById('calc-d');

        function updateInputStates() {
            if (calcDeffRadio.checked) {
                deffInput.disabled = true;
                adocInput.disabled = false;
                dInput.disabled = false;
            } else if (calcAdocRadio.checked) {
                deffInput.disabled = false;
                adocInput.disabled = true;
                dInput.disabled = false;
            } else if (calcDRadio.checked) {
                deffInput.disabled = false;
                adocInput.disabled = false;
                dInput.disabled = true;
            }
        }

        calculateBtn.addEventListener('click', calculate);
        [calcDeffRadio, calcAdocRadio, calcDRadio].forEach(radio => {
            radio.addEventListener('change', updateInputStates);
        });
        updateInputStates();

        [deffInput, adocInput, dInput].forEach(input => {
            input.addEventListener('keypress', function(e) {
                if (e.key === 'Enter') {
                    calculate();
                }
            });
        });

        function calculate() {
            const deff = parseFloat(deffInput.value.replace(/,/g, ''));
            const adoc = parseFloat(adocInput.value.replace(/,/g, ''));
            const d = parseFloat(dInput.value.replace(/,/g, ''));

            if (calcDeffRadio.checked) {
                if (isNaN(adoc) || isNaN(d) || adoc <= 0 || d <= 0 || adoc >= d) {
                    alert('Please enter valid positive numbers for Axial Depth of Cut and Tool Diameter (ADOC < D)');
                    return;
                }
                const calculatedDeff = 2 * Math.sqrt(adoc * (d - adoc));
                deffInput.value = calculatedDeff.toFixed(3);
            } else if (calcAdocRadio.checked) {
                if (isNaN(deff) || isNaN(d) || deff <= 0 || d <= 0) {
                    alert('Please enter valid positive numbers for Effective Diameter and Tool Diameter');
                    return;
                }
                const discriminant = (Math.pow(deff / 2, 2)) / d;
                if (discriminant > 1) {
                    alert('No valid solution: Effective Diameter too large for given Tool Diameter');
                    return;
                }
                const calculatedAdoc = d - Math.sqrt(d * (d - Math.pow(deff / 2, 2) / d));
                adocInput.value = calculatedAdoc.toFixed(3);
            } else if (calcDRadio.checked) {
                if (isNaN(deff) || isNaN(adoc) || deff <= 0 || adoc <= 0) {
                    alert('Please enter valid positive numbers for Effective Diameter and Axial Depth of Cut');
                    return;
                }
                const calculatedD = (Math.pow(deff / 2, 2) / adoc) + adoc;
                dInput.value = calculatedD.toFixed(3);
            }
        }
    });