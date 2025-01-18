// Comprehensive list of common donation and need items
// Comprehensive list of common donation and need items
const COMMON_ITEMS = [
    // Food
    'Canned Goods', 'Non-Perishable Food', 'Rice', 'Pasta', 'Bread', 
    'Cereal', 'Peanut Butter', 'Canned Soup', 'Instant Noodles', 
    'Protein Bars', 'Baby Food',

    // Clothing
    'T-Shirts', 'Sweaters', 'Jackets', 'Pants', 'Shorts', 'Underwear', 
    'Socks', 'Shoes', 'Coats', 'Blankets', 'Sleeping Bags',

    // Hygiene
    'Toothpaste', 'Toothbrush', 'Soap', 'Shampoo', 'Feminine Products', 
    'Deodorant', 'Hand Sanitizer', 'Toilet Paper', 'Wet Wipes', 
    'First Aid Kit',

    // Baby Supplies
    'Diapers', 'Baby Wipes', 'Baby Bottles', 'Baby Formula',

    // General Supplies
    'Water Bottles', 'Batteries', 'Flashlights', 'Masks', 'Gloves', 
    'Cleaning Supplies', 'Trash Bags', 'Paper Towels',

    // Miscellaneous
    'Books', 'School Supplies', 'Toys', 'Pet Food'
];
/**
 * Validate item inputs to ensure they are from the predefined list
 * @param {string} formId - ID of the form to validate
 * @returns {boolean} - Whether all item inputs are valid
 */

function validateItemInputs(formId) {
    const form = document.getElementById(formId);
    if (!form) {
        console.error(`Form with ID ${formId} not found`);
        return false;
    }

    const itemInputs = form.querySelectorAll('input[id^="itemName_"]');
    let isValid = true;

    itemInputs.forEach(input => {
        const inputValue = input.value.trim();
        
        // Check if the input is in the common items list
        if (!COMMON_ITEMS.includes(inputValue)) {
            input.setCustomValidity('Please select a valid item from the list');
            input.reportValidity();
            isValid = false;
        } else {
            input.setCustomValidity('');
        }
    });

    return isValid;
}

class SearchableDropdown {
    constructor(inputElement, options = COMMON_ITEMS) {
        this.input = inputElement;
        this.options = options;
        this.createDropdownStructure();
        this.setupEventListeners();
        this.validSelection = false;
    }

    
    createDropdownStructure() {
        // Create wrapper
        const wrapper = document.createElement('div');
        wrapper.className = 'searchable-dropdown-wrapper';
        
        // Move input inside wrapper
        this.input.parentNode.insertBefore(wrapper, this.input);
        wrapper.appendChild(this.input);

        // Create dropdown list
        const dropdownList = document.createElement('div');
        dropdownList.className = 'searchable-dropdown-list';
        wrapper.appendChild(dropdownList);

        // Style the input and wrapper
        this.input.classList.add('searchable-dropdown-input');
        wrapper.style.position = 'relative';
        dropdownList.style.display = 'none';
        dropdownList.style.position = 'absolute';
        dropdownList.style.top = '100%';
        dropdownList.style.left = '0';
        dropdownList.style.width = '100%';
        dropdownList.style.maxHeight = '200px';
        dropdownList.style.overflowY = 'auto';
        dropdownList.style.border = '1px solid #ccc';
        dropdownList.style.backgroundColor = 'white';
        dropdownList.style.zIndex = '1000';
    }

    setupEventListeners() {
        const wrapper = this.input.closest('.searchable-dropdown-wrapper');
        const dropdownList = wrapper.querySelector('.searchable-dropdown-list');

        // Input focus: show dropdown
        this.input.addEventListener('focus', () => {
            this.renderDropdownOptions();
            dropdownList.style.display = 'block';
        });

        // Input typing: filter options
        this.input.addEventListener('input', () => {
            this.renderDropdownOptions();
            this.validSelection = false;
            this.input.setCustomValidity('Please select an item from the list');
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!wrapper.contains(e.target)) {
                dropdownList.style.display = 'none';
            }
        });
    }

    renderDropdownOptions() {
        const wrapper = this.input.closest('.searchable-dropdown-wrapper');
        const dropdownList = wrapper.querySelector('.searchable-dropdown-list');
        const searchTerm = this.input.value.toLowerCase();

        // Clear previous options
        dropdownList.innerHTML = '';

        // Filter and render matching options
        const matchingOptions = this.options.filter(option => 
            option.toLowerCase().includes(searchTerm)
        );

        matchingOptions.forEach(option => {
            const optionElement = document.createElement('div');
            optionElement.textContent = option;
            optionElement.style.padding = '5px 10px';
            optionElement.style.cursor = 'pointer';
            optionElement.addEventListener('mouseover', () => {
                optionElement.style.backgroundColor = '#f0f0f0';
            });
            optionElement.addEventListener('mouseout', () => {
                optionElement.style.backgroundColor = '';
            });
            optionElement.addEventListener('click', () => {
                this.input.value = option;
                dropdownList.style.display = 'none';
                this.validSelection = true;
                this.input.setCustomValidity('');
            });
            dropdownList.appendChild(optionElement);
        });

        // If no matching options, show a message
        if (matchingOptions.length === 0) {
            const noOptionsElement = document.createElement('div');
            noOptionsElement.textContent = 'No matching items';
            noOptionsElement.style.padding = '5px 10px';
            noOptionsElement.style.color = '#888';
            dropdownList.appendChild(noOptionsElement);
        }
    }
}

// Global function to initialize dropdowns
function initializeItemDropdowns() {
    console.log('Initializing dropdowns');
    console.log('Document ready state:', document.readyState);
    
    const itemInputs = document.querySelectorAll('input[id^="itemName_"]');
    console.log('Item inputs found:', itemInputs.length);
    
    itemInputs.forEach((input, index) => {
        console.log(`Attempting to create dropdown for input ${index}:`, {
            id: input.id,
            type: input.type,
            value: input.value,
            parent: input.parentElement,
            isConnectedToDOM: document.body.contains(input)
        });
        
        try {
            // Ensure the input is in the DOM
            if (document.body.contains(input)) {
                new SearchableDropdown(input);
                console.log(`Dropdown created for ${input.id}`);
            } else {
                console.warn(`Input ${input.id} not in DOM`);
            }
        } catch (error) {
            console.error('Dropdown creation error:', error);
        }
    });
}

// Add multiple event listeners
document.addEventListener('DOMContentLoaded', initializeItemDropdowns);
document.addEventListener('load', initializeItemDropdowns);

// Expose for manual debugging
window.debugDropdowns = initializeItemDropdowns;

// Call this after dynamically adding new rows
function reinitializeItemDropdowns() {
    console.log('Reinitializing Item Dropdowns');
    initializeItemDropdowns();
}

// Initialize dropdowns on page load
document.addEventListener('DOMContentLoaded', initializeItemDropdowns);

// Expose functions globally for debugging
window.initializeItemDropdowns = initializeItemDropdowns;
window.reinitializeItemDropdowns = reinitializeItemDropdowns;