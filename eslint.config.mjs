import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint'; // 处理 TS 语法
import stylistic from '@stylistic/eslint-plugin'; // 处理分号、空格等

export default tseslint.config(
    js.configs.recommended,
    ...tseslint.configs.recommended, // 引入 TS 推荐规则
    {
        // 1. 明确告诉 ESLint 哪些文件需要应用这些规则
        files: ['**/*.ts', '**/*.js'],
        plugins: {
            '@stylistic': stylistic
        },
        languageOptions: {
            parser: tseslint.parser, // 使用 TS 解析器
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: {
                ...globals.node
            }
        },
        rules: {
            // 2. 使用 @stylistic 的分号规则
            '@stylistic/semi': ['warn', 'always'],
            '@stylistic/indent': ['warn', 4],
            '@stylistic/quotes': ['warn', 'single'],
            'no-unused-vars': 'off',
            '@typescript-eslint/no-unused-vars': ['warn', { "argsIgnorePattern": "^_" }],
            'no-undef': 'error',
            'no-console': 'off', // 后端项目允许 console

            // 最佳实践
            'eqeqeq': ['error', 'always'],
            'no-var': 'error',
            'prefer-const': 'warn',
            'prefer-arrow-callback': 'warn',

            // 代码风格
            'indent': ['warn', 4], // 4 空格缩进
            'quotes': ['warn', 'single', { avoidEscape: true }],
            'semi': ['warn', 'always'],
            'comma-dangle': ['warn', 'never'],
            'no-trailing-spaces': 'warn',
            'eol-last': ['warn', 'always'],

            // 可读性
            'no-multiple-empty-lines': ['warn', { max: 2, maxEOF: 1 }],
            'space-before-function-paren': ['warn', {
                anonymous: 'always',
                named: 'never',
                asyncArrow: 'always'
            }],
            'object-curly-spacing': ['warn', 'always'],
            'array-bracket-spacing': ['warn', 'never'],

            // 错误预防
            'no-await-in-loop': 'warn',
            'require-atomic-updates': 'warn',
            'no-return-await': 'warn',
            '@typescript-eslint/no-explicit-any': 'off',
        }
    },
    {
        // 4. 忽略编译后的产物
        ignores: ['dist/**', 'node_modules/**']
    }
);