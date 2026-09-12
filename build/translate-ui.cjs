/* eslint-disable */
const translatedProps = new Set([
    'aria-label',
    'alt',
    'buttonText',
    'caption',
    'description',
    'emptyLabel',
    'label',
    'loadingLabel',
    'message',
    'placeholder',
    'separator',
    'submitLabel',
    'text',
    'title',
]);

const technicalValues = /^(?:[a-z0-9]*[_.:/-][a-z0-9_.:/-]*|#[0-9a-f]{3,8}|\d+(?:\.\d+)?|[A-Z0-9_]+)$/;
const uiContainerNames = /(?:copy|description|empty|error|heading|label|labels|message|placeholder|subtitle|text|title)$/i;

module.exports = function translateUiLiterals({ types: t }) {
    let programPath;
    let needsImport = false;
    let skipCurrentFile = false;

    const translationCall = (value) => {
        needsImport = true;

        return t.callExpression(t.identifier('__translateUi'), [t.stringLiteral(value)]);
    };

    const translatedTemplate = (node) => {
        if (node.expressions.length === 0) {
            return translationCall(node.quasis[0]?.value.cooked ?? '');
        }

        const quasis = [t.templateElement({ raw: '', cooked: '' })];
        const expressions = [];

        const appendLiteral = (raw, cooked) => {
            const current = quasis.at(-1);
            current.value.raw += raw;
            current.value.cooked += cooked;
        };

        node.quasis.forEach((quasi, index) => {
            const cooked = quasi.value.cooked ?? quasi.value.raw;

            if (isHumanText(cooked)) {
                expressions.push(translationCall(cooked));
                quasis.push(t.templateElement({ raw: '', cooked: '' }));
            } else {
                appendLiteral(quasi.value.raw, cooked);
            }

            if (index < node.expressions.length) {
                expressions.push(node.expressions[index]);
                quasis.push(t.templateElement({ raw: '', cooked: '' }));
            }
        });

        quasis.forEach((quasi, index) => {
            quasi.tail = index === quasis.length - 1;
        });

        return t.templateLiteral(quasis, expressions);
    };

    const isHumanText = (value) => {
        const normalized = value.trim();

        return normalized.length > 1 && /[A-Za-zÀ-ÿ]/u.test(normalized) && !technicalValues.test(normalized);
    };

    const isRenderedExpressionValue = (path, container) => {
        let current = path;

        while (current.parentPath && current.parentPath !== container) {
            const parent = current.parentPath;

            if (parent.isConditionalExpression()) {
                if (current.key === 'test') {
                    return false;
                }
            } else if (parent.isLogicalExpression()) {
                if (current.key === 'left') {
                    return false;
                }
            } else if (!parent.isParenthesizedExpression() && !parent.isTSAsExpression() && !parent.isTSNonNullExpression()) {
                return false;
            }

            current = parent;
        }

        return current.parentPath === container;
    };

    const enclosingNamedContainer = (path) => {
        const owner = path.findParent(
            (candidate) =>
                candidate.isVariableDeclarator() ||
                candidate.isFunctionDeclaration() ||
                candidate.isFunctionExpression() ||
                candidate.isArrowFunctionExpression(),
        );

        if (!owner) return '';
        if (owner.isVariableDeclarator() && t.isIdentifier(owner.node.id)) return owner.node.id.name;
        if (owner.isFunctionDeclaration() && owner.node.id) return owner.node.id.name;

        const declaration = owner.parentPath;

        return declaration?.isVariableDeclarator() && t.isIdentifier(declaration.node.id) ? declaration.node.id.name : '';
    };

    return {
        name: 'translate-ui-literals',
        visitor: {
            Program: {
                enter(path, state) {
                    programPath = path;
                    needsImport = false;
                    skipCurrentFile = /[\\/]lib[\\/]i18n\.ts$/u.test(state.filename ?? '');

                    if (skipCurrentFile) {
                        path.skip();
                    }
                },
                exit() {
                    if (skipCurrentFile || !needsImport) {
                        return;
                    }

                    const alreadyImported = programPath.node.body.some(
                        (node) =>
                            t.isImportDeclaration(node) &&
                            node.source.value === '@/lib/i18n' &&
                            node.specifiers.some((specifier) => t.isImportSpecifier(specifier) && specifier.local.name === '__translateUi'),
                    );

                    if (!alreadyImported) {
                        programPath.unshiftContainer(
                            'body',
                            t.importDeclaration(
                                [t.importSpecifier(t.identifier('__translateUi'), t.identifier('translate'))],
                                t.stringLiteral('@/lib/i18n'),
                            ),
                        );
                    }
                },
            },
            JSXText(path) {
                if (isHumanText(path.node.value)) {
                    path.replaceWith(t.jsxExpressionContainer(translationCall(path.node.value)));
                }
            },
            JSXAttribute(path) {
                const name = t.isJSXIdentifier(path.node.name) ? path.node.name.name : null;

                if (
                    name !== null &&
                    translatedProps.has(name) &&
                    t.isStringLiteral(path.node.value) &&
                    isHumanText(path.node.value.value)
                ) {
                    path.node.value = t.jsxExpressionContainer(translationCall(path.node.value.value));
                }
            },
            ObjectProperty(path) {
                const name = t.isIdentifier(path.node.key)
                    ? path.node.key.name
                    : t.isStringLiteral(path.node.key)
                      ? path.node.key.value
                      : null;

                const translatedContainer = uiContainerNames.test(enclosingNamedContainer(path));

                if (
                    name !== null &&
                    (translatedProps.has(name) || translatedContainer) &&
                    t.isStringLiteral(path.node.value) &&
                    isHumanText(path.node.value.value)
                ) {
                    const translatedValue = translationCall(path.node.value.value);

                    // Navigation and form metadata commonly live at module
                    // scope. Resolve their copy when React reads the property
                    // so an Inertia locale switch does not retain stale text.
                    path.replaceWith(
                        t.objectMethod(
                            'get',
                            path.node.key,
                            [],
                            t.blockStatement([t.returnStatement(translatedValue)]),
                            path.node.computed,
                        ),
                    );
                    path.skip();
                }
            },
            StringLiteral(path) {
                if (
                    path.findParent((parent) => parent.isTSType()) ||
                    !isHumanText(path.node.value) ||
                    path.findParent(
                        (parent) =>
                            parent.isCallExpression() &&
                            parent.get('callee').isIdentifier({
                                name: '__translateUi',
                            }),
                    )
                ) {
                    return;
                }

                const attribute = path.findParent((candidate) => candidate.isJSXAttribute());
                if (attribute) {
                    if (path.parentPath.isJSXAttribute()) {
                        return;
                    }

                    const attributeName = attribute.get('name');
                    if (attributeName.isJSXIdentifier() && translatedProps.has(attributeName.node.name)) {
                        path.replaceWith(translationCall(path.node.value));
                    }

                    return;
                }

                const container = path.findParent((candidate) => candidate.isJSXExpressionContainer());
                const isRenderedExpression = Boolean(
                    container && !container.parentPath.isJSXAttribute() && isRenderedExpressionValue(path, container),
                );

                if (isRenderedExpression) {
                    path.replaceWith(translationCall(path.node.value));

                    return;
                }

                if (uiContainerNames.test(enclosingNamedContainer(path))) {
                    path.replaceWith(translationCall(path.node.value));
                }
            },
            TemplateLiteral(path) {
                if (
                    path.parentPath.isCallExpression() &&
                    path.parentPath.get('callee').isIdentifier() &&
                    ['t', 'translate', '__translateUi'].includes(path.parentPath.node.callee.name)
                ) {
                    return;
                }

                const container = path.findParent((candidate) => candidate.isJSXExpressionContainer());
                const jsxElement = container?.parentPath;
                const isStyleElement = Boolean(
                    jsxElement?.isJSXElement() &&
                    t.isJSXIdentifier(jsxElement.node.openingElement.name, {
                        name: 'style',
                    }),
                );
                const isRenderedExpression = Boolean(
                    container && !container.parentPath.isJSXAttribute() && isRenderedExpressionValue(path, container) && !isStyleElement,
                );
                const visibleText = path.node.quasis.map((quasi) => quasi.value.cooked ?? '').join(' ');

                const attribute = path.findParent((candidate) => candidate.isJSXAttribute());
                const attributeName = attribute?.get('name');
                const isTranslatedAttribute = Boolean(attributeName?.isJSXIdentifier() && translatedProps.has(attributeName.node.name));

                if (isTranslatedAttribute && isHumanText(visibleText)) {
                    needsImport = true;
                    path.replaceWith(translatedTemplate(path.node));
                    path.skip();

                    return;
                }

                if (isRenderedExpression && isHumanText(visibleText)) {
                    needsImport = true;
                    path.replaceWith(translatedTemplate(path.node));
                    path.skip();
                }
            },
        },
    };
};
