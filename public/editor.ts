interface RoutingLogic {
    [key: string]: {
        default: number | string;
        answers?: {
            [key: string]: number | string;
        };
    };
}

interface CustomDiv {
    name: string;
    index: number;
}

let formElements: HTMLElement[] = [];
let customDivs: HTMLElement[] = [];
let routingLogic: RoutingLogic = {};
let currentElementIndex = 0;
let customDivNames: CustomDiv[] = [];

document.getElementById('loadForm')!.addEventListener('click', () => {
    let formCode = (document.getElementById('formCode') as HTMLTextAreaElement).value;

    // Remove the submit button div
    formCode = formCode.replace(/<div class="infusion-submit">[\s\S]*?<\/div>/g, '');

    const previewContainer = document.getElementById('formPreview')!;
    previewContainer.innerHTML = formCode;

    // Remove empty divs
    removeEmptyDivs(previewContainer);

    const infusionFields = previewContainer.querySelectorAll('.infusion-field');
    formElements = Array.from(infusionFields) as HTMLElement[];

    currentElementIndex = 0;
    setDefaultRouting();
    formatFormElements();
    generateQuestionList();
    addNavigationButtons(previewContainer);
    showQuestion(currentElementIndex);
});

document.getElementById('saveForm')!.addEventListener('click', async () => {
    const formHtml = document.getElementById('formPreview')!.innerHTML;
    const routingJson = JSON.stringify(routingLogic, null, 2);
    const customDivHtml = customDivs.map(div => div.outerHTML).join('\n');

    const formConfig = {
        html: formHtml + customDivHtml,
        script: `
            const routingLogic = ${routingJson};
            const formElements = Array.from(document.querySelectorAll('.infusion-field')).concat(Array.from(document.querySelectorAll('.custom-div')));
            let currentElementIndex = 0;

            function showQuestion(index) {
                formElements.forEach((el, i) => {
                    const inputEl = el.querySelector('input, select, textarea');
                    if (i === index) {
                        el.style.display = '';
                        if (inputEl) {
                            inputEl.setAttribute('required', 'required');
                        }
                    } else {
                        el.style.display = 'none';
                        if (inputEl) {
                            inputEl.removeAttribute('required');
                        }
                    }
                });
                document.getElementById('backButton').style.display = index === 0 ? 'none' : 'inline-block';
                document.getElementById('nextButton').textContent = index === formElements.length - 1 ? 'Submit' : 'Next';
                document.getElementById('nextButton').type = index === formElements.length - 1 ? 'submit' : 'button';
            }

            function getNextIndex(currentElement) {
                const inputEl = currentElement.querySelector('input, select, textarea');
                const elementName = inputEl ? inputEl.name : null;
                let nextIndex = elementName ? routingLogic[elementName].default : 'submit';

                if (elementName && routingLogic[elementName].answers && routingLogic[elementName].answers[inputEl.value]) {
                    nextIndex = routingLogic[elementName].answers[inputEl.value];
                }

                if (nextIndex === 'submit' || !nextIndex) {
                    return 'submit';
                }
                return parseInt(nextIndex, 10);
            }

            function handleNextButton() {
                const currentElement = formElements[currentElementIndex];
                const nextIndex = getNextIndex(currentElement);
                if (nextIndex === 'submit') {
                    document.querySelector('form').submit();
                } else {
                    currentElementIndex = nextIndex;
                    showQuestion(currentElementIndex);
                }
            }

            function handleBackButton() {
                if (currentElementIndex > 0) {
                    currentElementIndex--;
                    showQuestion(currentElementIndex);
                }
            }

            document.getElementById('nextButton').addEventListener('click', handleNextButton);
                    document.getElementById('backButton').addEventListener('click', handleBackButton);

        showQuestion(currentElementIndex);
    `
    };

    const response = await fetch('https://yourserver.com/api/forms', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ formId: 'your-form-id', formConfig })
    });

    if (response.ok) {
        alert('Form saved successfully');
    } else {
        alert('Failed to save form');
    }
});
function removeEmptyDivs(container: HTMLElement) {
    const emptyDivs = container.querySelectorAll('div:empty');
    emptyDivs.forEach(div => div.remove());
}

function setDefaultRouting() {
    formElements.forEach((el, i) => {
        const inputEl = el.querySelector('input, select, textarea');
        if (inputEl) {
            routingLogic[inputEl.name] = {
                default: i + 1 < formElements.length ? i + 1 : 'submit',
                answers: {}
            };
        }
    });
}

function formatFormElements() {
    formElements.forEach(el => {
        const label = el.querySelector('label');
        const input = el.querySelector('input, select, textarea');
        if (label && input) {
            el.insertBefore(label, input);
            label.classList.add('form-label');
            input.classList.add('form-control');
        }
        if (input && input.tagName === 'TEXTAREA') {
            (input as HTMLTextAreaElement).rows = 15;
        }
    });
}

function generateQuestionList() {
    const questionList = document.getElementById('questionList')!;
    questionList.innerHTML = '';
    formElements.forEach((el, i) => {
        const inputEl = el.querySelector('input, select, textarea');
        if (inputEl) {
            const questionDiv = document.createElement('div');
            questionDiv.classList.add('question-preview');
            questionDiv.innerHTML = `
                <strong>Question ${i + 1}</strong>: ${el.querySelector('label')?.textContent}
                <div class="answer-routing">
                    <label>Default Next Question: </label>
                    <select onchange="updateRoutingLogic('${inputEl.name}', this.value)">
                        ${generateRoutingOptions(i)}
                    </select>
                </div>
            `;
            questionList.appendChild(questionDiv);
        }
    });
}
function generateRoutingOptions(currentIndex: number) {
    let options = '';
    formElements.forEach((_, i) => {
        if (i > currentIndex) {
            options += `<option value="${i}">Question ${i + 1}</option>`;
        }
    });
    options += `<option value="submit">Submit</option>`;
    return options;
}
function updateRoutingLogic(fieldName: string, value: string) {
    if (value === 'submit') {
        routingLogic[fieldName].default = 'submit';
    } else {
        routingLogic[fieldName].default = parseInt(value, 10);
    }
}
function addNavigationButtons(container: HTMLElement) {
    const navigationDiv = document.createElement('div');
    navigationDiv.id = 'formNavigation';
    navigationDiv.innerHTML = `
        <button type="button" id="backButton" class="btn btn-secondary">Back</button>
        <button type="button" id="nextButton" class="btn btn-primary">Next</button>
    `;
    container.appendChild(navigationDiv);
    document.getElementById('nextButton')!.addEventListener('click', handleNextButton);
    document.getElementById('backButton')!.addEventListener('click', handleBackButton);
}

function showQuestion(index: number) {
    formElements.forEach((el, i) => {
        const inputEl = el.querySelector('input, select, textarea');
        if (i === index) {
            el.style.display = '';
            if (inputEl) {
                inputEl.setAttribute('required', 'required');
            }
        } else {
            el.style.display = 'none';
            if (inputEl) {
                inputEl.removeAttribute('required');
            }
        }
    });
    customDivs.forEach((el, i) => {
        const customDivIndex = formElements.length + i;
        el.style.display = customDivIndex === index ? '' : 'none';
    });
    document.getElementById('backButton')!.style.display = index === 0 ? 'none' : 'inline-block';
    document.getElementById('nextButton')!.textContent = index === formElements.length + customDivs.length - 1 ? 'Submit' : 'Next';
    document.getElementById('nextButton')!.type = index === formElements.length + customDivs.length - 1 ? 'submit' : 'button';
}

function handleNextButton() {
    const currentElement = formElements[currentElementIndex];
    const nextIndex = getNextIndex(currentElement);
    if (nextIndex === 'submit') {
        document.querySelector('form')!.submit();
    } else {
        currentElementIndex = nextIndex;
        showQuestion(currentElementIndex);
    }
}

function handleBackButton() {
    if (currentElementIndex > 0) {
        currentElementIndex--;
        showQuestion(currentElementIndex);
    }
}

function getNextIndex(currentElement: HTMLElement) {
    const inputEl = currentElement.querySelector('input, select, textarea');
    const elementName = inputEl ? inputEl.name : null;
    let nextIndex = elementName ? routingLogic[elementName].default : 'submit';
    if (elementName && routingLogic[elementName].answers && routingLogic[elementName].answers[inputEl.value]) {
        nextIndex = routingLogic[elementName].answers[inputEl.value];
    }

    if (nextIndex === 'submit' || !nextIndex) {
        return 'submit';
    }
    return parseInt(nextIndex, 10);
}