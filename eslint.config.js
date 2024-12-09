import eslint from '@eslint/js';
import globals from 'globals';

export default [
    eslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            "no-unused-vars": "warn",
            "no-undef": "warn"
        }
    }
];

/*
const eslint = require('@eslint/js');
const globals = require('globals');

module.exports = [
    eslint.configs.recommended,
    {
        languageOptions: {
            globals: {
                ...globals.node
            }
        },
        rules: {
            'no-unused-vars': 'warn'
        }
    }
];
*/