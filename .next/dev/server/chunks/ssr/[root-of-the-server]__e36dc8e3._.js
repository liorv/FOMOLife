module.exports = [
"[project]/src/utils/assetResolver.js [ssr] (ecmascript)", ((__turbopack_context__, module, exports) => {

// Utility helpers for normalizing imported/static asset references
// Normalize asset imports that may be objects (bundlers like Parcel/webpack)
function assetUrl(a) {
    return a && typeof a === 'object' && 'default' in a ? a.default : a;
}
function resolveAsset(a) {
    if (!a) return '';
    if (typeof a === 'string') return a;
    if (typeof a === 'object') {
        // common explicit fields
        if ('default' in a && typeof a.default === 'string') return a.default;
        if ('url' in a && typeof a.url === 'string') return a.url;
        if ('src' in a && typeof a.src === 'string') return a.src;
        // handle bundlers that return an object with other string props (e.g. Parcel)
        for (const k of Object.keys(a)){
            const v = a[k];
            if (typeof v === 'string' && /\.(png|jpe?g|svg|gif|webp)(\?.*)?$/i.test(v)) return v;
        }
        // array-like first string
        if (Array.isArray(a) && a.length && typeof a[0] === 'string') return a[0];
    }
    try {
        return String(a);
    } catch  {
        return '';
    }
}
module.exports = {
    assetUrl,
    resolveAsset
};
}),
"[project]/src/SmartImage.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>SmartImage
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
/* eslint-disable no-restricted-syntax */ var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
// Minimal robust image component with fallback and tolerant logging.
// Accepts bundler-imported asset objects of many shapes — reuse `resolveAsset` so
// Parcel/webpack/other bundlers' variations are handled consistently.
const { resolveAsset } = __turbopack_context__.r("[project]/src/utils/assetResolver.js [ssr] (ecmascript)");
function SmartImage({ src, alt = '', className = '', style = {}, fallback = null, ...props }) {
    const normalize = (s)=>{
        if (!s) return '';
        // prefer resolveAsset which knows many bundler shapes
        try {
            const r = resolveAsset(s);
            if (r) return r;
        } catch (_) {}
        // fallback to simple default property or string coercion
        if (s && typeof s === 'object' && 'default' in s) return s.default || '';
        return typeof s === 'string' ? s : '';
    };
    const initial = normalize(src) || normalize(fallback) || '';
    const [cur, setCur] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(initial);
    // keep `cur` in sync if caller changes `src` or `fallback`
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const next = normalize(src) || normalize(fallback) || '';
        if (next !== cur) setCur(next);
    }, [
        src,
        fallback
    ]); // eslint-disable-line react-hooks/exhaustive-deps
    const onErr = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useCallback"])((e)=>{
        // Prefer warning (avoids dev-overlay treating this as a hard error),
        // but still provide useful debug info in console.
        try {
            // eslint-disable-next-line no-console
            console.warn('SmartImage failed to load:', e?.currentTarget?.src || cur);
        } catch (err) {
        /* ignore */ }
        const resolvedFallback = normalize(fallback) || null;
        if (resolvedFallback && cur !== resolvedFallback) setCur(resolvedFallback);
    }, [
        fallback,
        cur
    ]);
    // small built-in SVG fallback (data URL) if none provided
    const svgFallback = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'><rect width='100%' height='100%' fill='%23f3f4f6'/><text x='50%' y='52%' font-size='20' text-anchor='middle' fill='%238b8b8b' font-family='Arial' dy='.35em'>IMG</text></svg>";
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("img", {
        src: cur || svgFallback,
        alt: alt,
        className: className,
        style: style,
        onError: onErr,
        ...props
    }, void 0, false, {
        fileName: "[project]/src/SmartImage.js",
        lineNumber: 46,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/TaskModal.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TaskEditor
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/SmartImage.js [ssr] (ecmascript)");
;
;
;
// logos are served from public/assets; no webpack import needed
const logoDiscordUrl = '/assets/logo_discord.png';
const logoSmsUrl = '/assets/logo_sms.png';
const logoWhatsappUrl = '/assets/logo_whatsapp.png';
function TaskEditor({ task, onSave, onClose, onUpdateTask = ()=>{}, allPeople = [], onOpenPeople = ()=>{}, onCreatePerson = ()=>{} }) {
    const [description, setDescription] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(task.description || '');
    // merge task-level people with global defaults so people's default notification methods
    // from the People tab are used unless overridden per-task
    const initialPeople = (task.people || []).map((p)=>{
        const name = typeof p === 'string' ? p : p.name || p;
        const taskMethods = typeof p === 'object' && p.methods ? {
            ...p.methods
        } : typeof p === 'object' && p.method ? {
            discord: p.method === 'discord',
            sms: p.method === 'sms',
            whatsapp: p.method === 'whatsapp'
        } : null;
        const global = allPeople.find((g)=>g.name === name);
        const mergedMethods = taskMethods || (global ? {
            ...global.methods || {}
        } : {
            discord: false,
            sms: false,
            whatsapp: false
        });
        return {
            name,
            methods: {
                discord: !!mergedMethods.discord,
                sms: !!mergedMethods.sms,
                whatsapp: !!mergedMethods.whatsapp
            }
        };
    });
    const [people, setPeople] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(initialPeople);
    const [searchQuery, setSearchQuery] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [activeSuggestion, setActiveSuggestion] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(-1);
    // keep a ref to latest editable state so cleanup can persist the most recent changes
    const latestRef = __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["default"].useRef({
        description: task.description || '',
        people: initialPeople
    });
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        latestRef.current = {
            description,
            people
        };
    }, [
        description,
        people
    ]);
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        // reset keyboard focus whenever the query changes
        setActiveSuggestion(-1);
    }, [
        searchQuery
    ]);
    // persist latest edits when editor unmounts (e.g. user switches tasks)
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        return ()=>{
            const { description: latestDesc, people: latestPeople } = latestRef.current;
            const normalized = latestPeople.map((p)=>({
                    name: p.name,
                    methods: p.methods || {
                        discord: false,
                        sms: false,
                        whatsapp: false
                    }
                }));
            onUpdateTask({
                ...task,
                description: latestDesc,
                people: normalized
            });
        };
    }, []);
    const handleAddFromAll = (person)=>{
        if (people.find((p)=>p.name === person.name)) return;
        setPeople([
            ...people,
            {
                name: person.name,
                methods: {
                    ...person.methods || {}
                }
            }
        ]);
        setSearchQuery('');
    };
    const handleRemovePerson = (name)=>{
        setPeople(people.filter((person)=>person.name !== name));
    };
    const handleTogglePersonMethod = (name, method)=>{
        setPeople((prev)=>prev.map((p)=>p.name === name ? {
                    ...p,
                    methods: {
                        ...p.methods,
                        [method]: !p.methods[method]
                    }
                } : p));
    };
    const saveToParent = (closeAfter = false)=>{
        // Ensure people saved with methods map
        const normalized = people.map((p)=>({
                name: p.name,
                methods: p.methods || {
                    discord: false,
                    sms: false,
                    whatsapp: false
                }
            }));
        // persist without closing
        onUpdateTask({
            ...task,
            description,
            people: normalized
        });
        // if caller requested a full save+close, call onSave (parent will close)
        if (closeAfter) onSave({
            ...task,
            description,
            people: normalized
        });
    };
    const handleSaveAndClose = ()=>saveToParent(true);
    // keyboard shortcuts: Esc (close+save when search empty), Ctrl/Cmd+Enter (save & close)
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        const onKey = (e)=>{
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                saveToParent(true);
                return;
            }
            if (e.key === 'Escape') {
                // if search is open, clear it first; otherwise close editor
                if (searchQuery.trim()) {
                    setSearchQuery('');
                    setActiveSuggestion(-1);
                    return;
                }
                saveToParent(true);
            }
        };
        window.addEventListener('keydown', onKey);
        return ()=>window.removeEventListener('keydown', onKey);
    }, [
        searchQuery,
        description,
        people
    ]);
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "side-editor",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("h2", {
                children: [
                    "Edit Task — ",
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "task-title-inline",
                        children: task.text
                    }, void 0, false, {
                        fileName: "[project]/src/TaskModal.js",
                        lineNumber: 94,
                        columnNumber: 23
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 94,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                className: "desc-label",
                children: "Description"
            }, void 0, false, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 96,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("textarea", {
                className: "task-description",
                value: description,
                onChange: (e)=>{
                    setDescription(e.target.value);
                }
            }, void 0, false, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 97,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "spacer"
            }, void 0, false, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 100,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("label", {
                children: "People to notify"
            }, void 0, false, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 102,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "people-list task-person-list",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "task-person-list-header",
                        "aria-hidden": true,
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "task-person-col name",
                                children: "Name"
                            }, void 0, false, {
                                fileName: "[project]/src/TaskModal.js",
                                lineNumber: 105,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "task-person-col methods",
                                children: "Methods"
                            }, void 0, false, {
                                fileName: "[project]/src/TaskModal.js",
                                lineNumber: 106,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/TaskModal.js",
                        lineNumber: 104,
                        columnNumber: 9
                    }, this),
                    people.map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "task-person-row",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "task-person-col name",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                                        className: "person-name",
                                        children: p.name
                                    }, void 0, false, {
                                        fileName: "[project]/src/TaskModal.js",
                                        lineNumber: 111,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/TaskModal.js",
                                    lineNumber: 110,
                                    columnNumber: 13
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "task-person-col methods",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "person-methods-inline",
                                        style: {
                                            justifyContent: 'flex-end'
                                        },
                                        children: [
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                className: p.methods.discord ? 'method-icon active' : 'method-icon',
                                                onClick: ()=>handleTogglePersonMethod(p.name, 'discord'),
                                                title: "Discord",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    src: logoDiscordUrl,
                                                    alt: "Discord",
                                                    className: "service-icon discord-icon"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/TaskModal.js",
                                                    lineNumber: 116,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/TaskModal.js",
                                                lineNumber: 115,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                className: p.methods.sms ? 'method-icon active' : 'method-icon',
                                                onClick: ()=>handleTogglePersonMethod(p.name, 'sms'),
                                                title: "SMS",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    src: logoSmsUrl,
                                                    alt: "SMS",
                                                    className: "service-icon sms-icon"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/TaskModal.js",
                                                    lineNumber: 119,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/TaskModal.js",
                                                lineNumber: 118,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                className: p.methods.whatsapp ? 'method-icon active' : 'method-icon',
                                                onClick: ()=>handleTogglePersonMethod(p.name, 'whatsapp'),
                                                title: "WhatsApp",
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                                    src: logoWhatsappUrl,
                                                    alt: "WhatsApp",
                                                    className: "service-icon whatsapp-icon"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/TaskModal.js",
                                                    lineNumber: 122,
                                                    columnNumber: 19
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/TaskModal.js",
                                                lineNumber: 121,
                                                columnNumber: 17
                                            }, this),
                                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                                className: "remove-btn",
                                                onClick: ()=>handleRemovePerson(p.name),
                                                "aria-label": `Remove ${p.name}`,
                                                style: {
                                                    marginLeft: 8
                                                },
                                                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                                    className: "material-icons",
                                                    children: "close"
                                                }, void 0, false, {
                                                    fileName: "[project]/src/TaskModal.js",
                                                    lineNumber: 124,
                                                    columnNumber: 146
                                                }, this)
                                            }, void 0, false, {
                                                fileName: "[project]/src/TaskModal.js",
                                                lineNumber: 124,
                                                columnNumber: 17
                                            }, this)
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/TaskModal.js",
                                        lineNumber: 114,
                                        columnNumber: 15
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/TaskModal.js",
                                    lineNumber: 113,
                                    columnNumber: 13
                                }, this)
                            ]
                        }, p.name, true, {
                            fileName: "[project]/src/TaskModal.js",
                            lineNumber: 109,
                            columnNumber: 11
                        }, this))
                ]
            }, void 0, true, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 103,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "add-person-bar",
                style: {
                    position: 'relative'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                        value: searchQuery,
                        onChange: (e)=>setSearchQuery(e.target.value),
                        placeholder: "Search people to add (type to find)",
                        onKeyDown: (e)=>{
                            const q = searchQuery.trim();
                            const lc = q.toLowerCase();
                            const matches = q ? allPeople.filter((p)=>p.name.toLowerCase().includes(lc) && !people.find((pp)=>pp.name.toLowerCase() === p.name.toLowerCase())).slice(0, 6) : [];
                            const itemsCount = matches.length > 0 ? matches.length : q ? 1 : 0;
                            if (e.key === 'ArrowDown') {
                                if (!q || itemsCount === 0) return;
                                e.preventDefault();
                                setActiveSuggestion((prev)=>prev >= itemsCount - 1 ? 0 : prev + 1);
                                return;
                            }
                            if (e.key === 'ArrowUp') {
                                if (!q || itemsCount === 0) return;
                                e.preventDefault();
                                setActiveSuggestion((prev)=>prev <= 0 ? itemsCount - 1 : prev - 1);
                                return;
                            }
                            if (e.key === 'Escape') {
                                setSearchQuery('');
                                setActiveSuggestion(-1);
                                return;
                            }
                            if (e.key === 'Enter') {
                                if (!q) return;
                                e.preventDefault();
                                if (activeSuggestion >= 0) {
                                    // choose highlighted suggestion
                                    if (matches.length > 0) {
                                        const chosen = matches[activeSuggestion];
                                        handleAddFromAll(chosen);
                                    } else {
                                        const created = {
                                            name: q,
                                            methods: {
                                                discord: false,
                                                sms: false,
                                                whatsapp: false
                                            }
                                        };
                                        setPeople((prev)=>prev.find((p)=>p.name === created.name) ? prev : [
                                                ...prev,
                                                created
                                            ]);
                                        onCreatePerson(created);
                                        setSearchQuery('');
                                    }
                                    setActiveSuggestion(-1);
                                    return;
                                }
                                // no highlighted item — fallback to existing behavior
                                const exact = allPeople.find((p)=>p.name.toLowerCase() === q.toLowerCase());
                                if (exact) handleAddFromAll(exact);
                                else {
                                    const created = {
                                        name: q,
                                        methods: {
                                            discord: false,
                                            sms: false,
                                            whatsapp: false
                                        }
                                    };
                                    setPeople((prev)=>prev.find((p)=>p.name === created.name) ? prev : [
                                            ...prev,
                                            created
                                        ]);
                                    setSearchQuery('');
                                    onCreatePerson(created);
                                }
                            }
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/TaskModal.js",
                        lineNumber: 132,
                        columnNumber: 9
                    }, this),
                    searchQuery.trim() && (()=>{
                        const q = searchQuery.trim().toLowerCase();
                        const matches = allPeople.filter((p)=>p.name.toLowerCase().includes(q) && !people.find((pp)=>pp.name.toLowerCase() === p.name.toLowerCase())).slice(0, 6);
                        // render a floating dropdown only when we have multiple matches
                        if (matches.length > 0) {
                            return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "search-suggestions dropdown",
                                role: "listbox",
                                "aria-label": "People suggestions",
                                children: matches.map((p, i)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        role: "option",
                                        "aria-selected": activeSuggestion === i,
                                        className: activeSuggestion === i ? 'task-person-row suggestion-row active' : 'task-person-row suggestion-row',
                                        onMouseEnter: ()=>setActiveSuggestion(i),
                                        onMouseLeave: ()=>setActiveSuggestion(-1),
                                        onClick: ()=>{
                                            handleAddFromAll(p);
                                            setActiveSuggestion(-1);
                                        },
                                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                            className: "task-person-col name",
                                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                                                children: p.name
                                            }, void 0, false, {
                                                fileName: "[project]/src/TaskModal.js",
                                                lineNumber: 209,
                                                columnNumber: 59
                                            }, this)
                                        }, void 0, false, {
                                            fileName: "[project]/src/TaskModal.js",
                                            lineNumber: 209,
                                            columnNumber: 21
                                        }, this)
                                    }, p.name, false, {
                                        fileName: "[project]/src/TaskModal.js",
                                        lineNumber: 200,
                                        columnNumber: 19
                                    }, this))
                            }, void 0, false, {
                                fileName: "[project]/src/TaskModal.js",
                                lineNumber: 198,
                                columnNumber: 15
                            }, this);
                        }
                        // no matches — show inline "Add" row (avoid floating box / scrollbars)
                        const newName = searchQuery.trim();
                        return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            role: "option",
                            className: activeSuggestion === 0 ? 'suggestion-inline active' : 'suggestion-inline',
                            onMouseEnter: ()=>setActiveSuggestion(0),
                            onMouseLeave: ()=>setActiveSuggestion(-1),
                            onClick: ()=>{
                                const created = {
                                    name: newName,
                                    methods: {
                                        discord: false,
                                        sms: false,
                                        whatsapp: false
                                    }
                                };
                                setPeople((prev)=>prev.find((p)=>p.name === created.name) ? prev : [
                                        ...prev,
                                        created
                                    ]);
                                setSearchQuery('');
                                setActiveSuggestion(-1);
                                onCreatePerson(created);
                            },
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "task-person-col name",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                                        children: [
                                            "Add “",
                                            newName,
                                            "”"
                                        ]
                                    }, void 0, true, {
                                        fileName: "[project]/src/TaskModal.js",
                                        lineNumber: 232,
                                        columnNumber: 53
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/TaskModal.js",
                                    lineNumber: 232,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "task-person-col methods",
                                    style: {
                                        color: '#7b8ca7'
                                    },
                                    children: "create and add to task"
                                }, void 0, false, {
                                    fileName: "[project]/src/TaskModal.js",
                                    lineNumber: 233,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/TaskModal.js",
                            lineNumber: 219,
                            columnNumber: 13
                        }, this);
                    })()
                ]
            }, void 0, true, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 131,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    flex: 1
                }
            }, void 0, false, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 239,
                columnNumber: 7
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                style: {
                    display: 'flex',
                    gap: 8,
                    alignItems: 'center',
                    justifyContent: 'center'
                },
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: "done-btn",
                        onClick: handleSaveAndClose,
                        title: "Done (save & close)",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                className: "material-icons",
                                style: {
                                    verticalAlign: 'middle',
                                    marginRight: 6
                                },
                                children: "check"
                            }, void 0, false, {
                                fileName: "[project]/src/TaskModal.js",
                                lineNumber: 242,
                                columnNumber: 95
                            }, this),
                            "Done"
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/TaskModal.js",
                        lineNumber: 242,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: "editor-close-btn",
                        onClick: handleSaveAndClose,
                        title: "Save & Close",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                            className: "material-icons",
                            children: "close"
                        }, void 0, false, {
                            fileName: "[project]/src/TaskModal.js",
                            lineNumber: 243,
                            columnNumber: 96
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/TaskModal.js",
                        lineNumber: 243,
                        columnNumber: 9
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/TaskModal.js",
                lineNumber: 241,
                columnNumber: 7
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/TaskModal.js",
        lineNumber: 93,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/Task.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Task
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
;
;
function Task({ item, idx, type, editorTaskIdx, setEditorTaskIdx, handleToggle, handleStar, handleDelete }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("li", {
        className: `${item.done ? 'done' : ''}${type === 'tasks' && editorTaskIdx === idx ? ' editing' : ''}`,
        children: [
            type === 'tasks' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                type: "checkbox",
                checked: item.done,
                onChange: ()=>handleToggle(idx),
                className: "task-checkbox",
                title: item.done ? 'Mark as incomplete' : 'Mark as complete'
            }, void 0, false, {
                fileName: "[project]/src/Task.js",
                lineNumber: 7,
                columnNumber: 9
            }, this),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                className: "task-title",
                onClick: ()=>type === 'tasks' ? setEditorTaskIdx(idx) : undefined,
                style: {
                    cursor: type === 'tasks' ? 'pointer' : 'default',
                    textDecoration: item.done ? 'line-through' : undefined
                },
                children: item.text
            }, void 0, false, {
                fileName: "[project]/src/Task.js",
                lineNumber: 15,
                columnNumber: 7
            }, this),
            type === 'tasks' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
                children: [
                    item.dueDate && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                        className: "due-date",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                className: "material-icons",
                                style: {
                                    verticalAlign: 'middle',
                                    fontSize: '1rem',
                                    marginRight: 6
                                },
                                children: "event"
                            }, void 0, false, {
                                fileName: "[project]/src/Task.js",
                                lineNumber: 25,
                                columnNumber: 40
                            }, this),
                            item.dueDate
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/Task.js",
                        lineNumber: 25,
                        columnNumber: 13
                    }, this),
                    (item.people || []).length > 0 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "task-people",
                        title: (item.people || []).map((p)=>p.name).join(', '),
                        children: [
                            (item.people || []).slice(0, 2).map((p)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                    className: "avatar small",
                                    children: p.name.split(' ').map((s)=>s[0]).slice(0, 2).join('').toUpperCase()
                                }, p.name, false, {
                                    fileName: "[project]/src/Task.js",
                                    lineNumber: 31,
                                    columnNumber: 17
                                }, this)),
                            (item.people || []).length > 2 && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "people-count",
                                children: [
                                    "+",
                                    (item.people || []).length - 2
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/Task.js",
                                lineNumber: 34,
                                columnNumber: 17
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/Task.js",
                        lineNumber: 29,
                        columnNumber: 13
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                        className: item.favorite ? 'star favorite' : 'star',
                        title: item.favorite ? 'Unstar' : 'Star',
                        onClick: ()=>handleStar(idx),
                        "aria-label": item.favorite ? 'Unstar' : 'Star',
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                            className: "material-icons",
                            children: item.favorite ? 'star' : 'star_border'
                        }, void 0, false, {
                            fileName: "[project]/src/Task.js",
                            lineNumber: 45,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/Task.js",
                        lineNumber: 39,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true),
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                className: "delete",
                onClick: ()=>handleDelete(idx),
                "aria-label": "Delete",
                children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                    className: "material-icons",
                    children: "close"
                }, void 0, false, {
                    fileName: "[project]/src/Task.js",
                    lineNumber: 49,
                    columnNumber: 88
                }, this)
            }, void 0, false, {
                fileName: "[project]/src/Task.js",
                lineNumber: 49,
                columnNumber: 7
            }, this)
        ]
    }, idx, true, {
        fileName: "[project]/src/Task.js",
        lineNumber: 5,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/TaskList.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>TaskList
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$Task$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/Task.js [ssr] (ecmascript)");
;
;
;
function TaskList({ items = [], type, editorTaskIdx, setEditorTaskIdx, handleToggle, handleStar, handleDelete }) {
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
        children: items.map((item, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$Task$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                item: item,
                idx: idx,
                type: type,
                editorTaskIdx: editorTaskIdx,
                setEditorTaskIdx: setEditorTaskIdx,
                handleToggle: handleToggle,
                handleStar: handleStar,
                handleDelete: handleDelete
            }, idx, false, {
                fileName: "[project]/src/TaskList.js",
                lineNumber: 8,
                columnNumber: 9
            }, this))
    }, void 0, false);
}
}),
"[project]/src/Person.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>Person
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/SmartImage.js [ssr] (ecmascript)");
;
;
;
// service icons are provided via public/assets
const logoDiscordUrl = '/assets/logo_discord.png';
const logoSmsUrl = '/assets/logo_sms.png';
const logoWhatsappUrl = '/assets/logo_whatsapp.png';
function Person({ person, idx, editingPersonIdx, editingPersonName, setEditingPersonIdx, setEditingPersonName, onSaveEdit, onCancelEdit, handleTogglePersonDefault, handleDelete, asRow = false }) {
    const Wrapper = asRow ? 'div' : 'li';
    const baseClass = asRow ? 'task-person-row' : 'person-chip task-person-row';
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(Wrapper, {
        className: baseClass,
        children: editingPersonIdx === idx ? /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
            style: {
                display: 'flex',
                gap: 8,
                alignItems: 'center'
            },
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                    value: editingPersonName,
                    onChange: (e)=>setEditingPersonName(e.target.value)
                }, void 0, false, {
                    fileName: "[project]/src/Person.js",
                    lineNumber: 16,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                    onClick: ()=>onSaveEdit(idx, editingPersonName),
                    children: "Save"
                }, void 0, false, {
                    fileName: "[project]/src/Person.js",
                    lineNumber: 17,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                    onClick: ()=>onCancelEdit(),
                    children: "Cancel"
                }, void 0, false, {
                    fileName: "[project]/src/Person.js",
                    lineNumber: 18,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true, {
            fileName: "[project]/src/Person.js",
            lineNumber: 15,
            columnNumber: 9
        }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["Fragment"], {
            children: [
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("strong", {
                    className: "person-name",
                    style: {
                        cursor: 'pointer'
                    },
                    onClick: ()=>{
                        setEditingPersonIdx(idx);
                        setEditingPersonName(person.name);
                    },
                    children: person.name
                }, void 0, false, {
                    fileName: "[project]/src/Person.js",
                    lineNumber: 22,
                    columnNumber: 11
                }, this),
                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                    className: "person-actions",
                    children: [
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                            className: "person-methods-inline",
                            children: [
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    className: person.methods.discord ? 'method-icon active' : 'method-icon',
                                    onClick: ()=>handleTogglePersonDefault(idx, 'discord'),
                                    title: "Discord",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        src: logoDiscordUrl,
                                        alt: "Discord",
                                        className: "service-icon discord-icon"
                                    }, void 0, false, {
                                        fileName: "[project]/src/Person.js",
                                        lineNumber: 26,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/Person.js",
                                    lineNumber: 25,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    className: person.methods.sms ? 'method-icon active' : 'method-icon',
                                    onClick: ()=>handleTogglePersonDefault(idx, 'sms'),
                                    title: "SMS",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        src: logoSmsUrl,
                                        alt: "SMS",
                                        className: "service-icon sms-icon"
                                    }, void 0, false, {
                                        fileName: "[project]/src/Person.js",
                                        lineNumber: 29,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/Person.js",
                                    lineNumber: 28,
                                    columnNumber: 15
                                }, this),
                                /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                    className: person.methods.whatsapp ? 'method-icon active' : 'method-icon',
                                    onClick: ()=>handleTogglePersonDefault(idx, 'whatsapp'),
                                    title: "WhatsApp",
                                    children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                        src: logoWhatsappUrl,
                                        alt: "WhatsApp",
                                        className: "service-icon whatsapp-icon"
                                    }, void 0, false, {
                                        fileName: "[project]/src/Person.js",
                                        lineNumber: 32,
                                        columnNumber: 17
                                    }, this)
                                }, void 0, false, {
                                    fileName: "[project]/src/Person.js",
                                    lineNumber: 31,
                                    columnNumber: 15
                                }, this)
                            ]
                        }, void 0, true, {
                            fileName: "[project]/src/Person.js",
                            lineNumber: 24,
                            columnNumber: 13
                        }, this),
                        /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                            className: "delete",
                            onClick: ()=>handleDelete(idx),
                            "aria-label": "Delete person",
                            children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("span", {
                                className: "material-icons",
                                children: "close"
                            }, void 0, false, {
                                fileName: "[project]/src/Person.js",
                                lineNumber: 35,
                                columnNumber: 101
                            }, this)
                        }, void 0, false, {
                            fileName: "[project]/src/Person.js",
                            lineNumber: 35,
                            columnNumber: 13
                        }, this)
                    ]
                }, void 0, true, {
                    fileName: "[project]/src/Person.js",
                    lineNumber: 23,
                    columnNumber: 11
                }, this)
            ]
        }, void 0, true)
    }, idx, false, {
        fileName: "[project]/src/Person.js",
        lineNumber: 13,
        columnNumber: 5
    }, this);
}
}),
"[project]/src/App.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react/jsx-dev-runtime [external] (react/jsx-dev-runtime, cjs)");
var __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__ = __turbopack_context__.i("[externals]/react [external] (react, cjs)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$TaskModal$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/TaskModal.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$TaskList$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/TaskList.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$SmartImage$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/SmartImage.js [ssr] (ecmascript)");
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$Person$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/Person.js [ssr] (ecmascript)");
;
;
;
;
;
;
// Use public/assets/ for all static assets
// logo now lives in public/assets, so we can reference it by an absolute path
// without importing. The assetResolver helpers are no longer necessary for
// the Next.js build; keeping them may still help tests, but we can bypass
// them for the public image.
const logoUrl = '/assets/logo_fomo.png';
const STORAGE_KEY = 'fomo_life_data';
function loadData() {
    try {
        return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {
            tasks: [],
            projects: [],
            dreams: [],
            people: []
        };
    } catch  {
        return {
            tasks: [],
            projects: [],
            dreams: [],
            people: []
        };
    }
}
function saveData(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}
function App() {
    // avoid reading localStorage during render so server & client markup match
    const [data, setData] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])({
        tasks: [],
        projects: [],
        dreams: [],
        people: []
    });
    const initializedRef = __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["default"].useRef(false);
    // load persisted state once on the client after hydration
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        setData(loadData());
        initializedRef.current = true;
    }, []);
    const [input, setInput] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [dueDate, setDueDate] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    const [type, setType] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('tasks');
    const [editorTaskIdx, setEditorTaskIdx] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [editingPersonIdx, setEditingPersonIdx] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])(null);
    const [editingPersonName, setEditingPersonName] = (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useState"])('');
    (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react__$5b$external$5d$__$28$react$2c$__cjs$29$__["useEffect"])(()=>{
        if (initializedRef.current) {
            saveData(data);
        }
    }, [
        data
    ]);
    const handleAdd = ()=>{
        if (!input.trim()) return;
        if (type === 'tasks') {
            setData((prev)=>({
                    ...prev,
                    tasks: [
                        ...prev.tasks,
                        {
                            text: input,
                            done: false,
                            dueDate: dueDate || null,
                            favorite: false,
                            people: []
                        }
                    ]
                }));
            setDueDate('');
        } else if (type === 'people') {
            const name = input.trim();
            setData((prev)=>({
                    ...prev,
                    people: prev.people.find((p)=>p.name === name) ? prev.people : [
                        ...prev.people,
                        {
                            name,
                            methods: {
                                discord: false,
                                sms: false,
                                whatsapp: false
                            }
                        }
                    ]
                }));
        } else {
            setData((prev)=>({
                    ...prev,
                    [type]: [
                        ...prev[type],
                        {
                            text: input,
                            done: false
                        }
                    ]
                }));
        }
        setInput('');
    };
    const handleToggle = (idx)=>{
        setData((prev)=>({
                ...prev,
                [type]: prev[type].map((item, i)=>i === idx ? {
                        ...item,
                        done: !item.done
                    } : item)
            }));
    };
    const handleDelete = (idx)=>{
        if (type === 'people') {
            const name = data.people[idx].name;
            setData((prev)=>({
                    ...prev,
                    people: prev.people.filter((_, i)=>i !== idx),
                    tasks: prev.tasks.map((t)=>({
                            ...t,
                            people: (t.people || []).filter((p)=>p.name !== name)
                        }))
                }));
            return;
        }
        setData((prev)=>({
                ...prev,
                [type]: prev[type].filter((_, i)=>i !== idx)
            }));
    };
    const handleStar = (idx)=>{
        if (type !== 'tasks') return;
        setData((prev)=>({
                ...prev,
                tasks: prev.tasks.map((item, i)=>i === idx ? {
                        ...item,
                        favorite: !item.favorite
                    } : item)
            }));
    };
    const handleTogglePersonDefault = (idx, method)=>{
        const person = data.people[idx];
        setData((prev)=>({
                ...prev,
                people: prev.people.map((p, i)=>i === idx ? {
                        ...p,
                        methods: {
                            ...p.methods,
                            [method]: !p.methods[method]
                        }
                    } : p),
                // update tasks to keep person defaults in sync
                tasks: prev.tasks.map((t)=>({
                        ...t,
                        people: (t.people || []).map((tp)=>tp.name === person.name ? {
                                ...tp,
                                methods: {
                                    ...tp.methods,
                                    [method]: !person.methods[method]
                                }
                            } : tp)
                    }))
            }));
    };
    const handleEditorSave = (updatedTask)=>{
        setData((prev)=>({
                ...prev,
                tasks: prev.tasks.map((t, i)=>i === editorTaskIdx ? {
                        ...t,
                        ...updatedTask
                    } : t)
            }));
        setEditorTaskIdx(null);
    };
    // persist changes from editor without closing it (used for autosave / unmount)
    const handleEditorUpdate = (updatedTask)=>{
        setData((prev)=>({
                ...prev,
                tasks: prev.tasks.map((t, i)=>i === editorTaskIdx ? {
                        ...t,
                        ...updatedTask
                    } : t)
            }));
    };
    const handleEditorClose = ()=>setEditorTaskIdx(null);
    const handleSavePersonEdit = (idx, newName)=>{
        const name = (newName || '').trim();
        if (!name) return;
        const oldName = data.people[idx].name;
        setData((prev)=>({
                ...prev,
                people: prev.people.map((p, i)=>i === idx ? {
                        ...p,
                        name
                    } : p),
                tasks: prev.tasks.map((t)=>({
                        ...t,
                        people: (t.people || []).map((tp)=>tp.name === oldName ? {
                                ...tp,
                                name
                            } : tp)
                    }))
            }));
        setEditingPersonIdx(null);
        setEditingPersonName('');
    };
    return /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
        className: "main-layout",
        children: [
            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                className: "container",
                children: [
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "logo-splash",
                        "aria-hidden": "true",
                        style: {
                            backgroundImage: `url(${logoUrl})`
                        }
                    }, void 0, false, {
                        fileName: "[project]/src/App.js",
                        lineNumber: 170,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "app-bar"
                    }, void 0, false, {
                        fileName: "[project]/src/App.js",
                        lineNumber: 171,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "tabs",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                className: type === 'tasks' ? 'active' : '',
                                onClick: ()=>setType('tasks'),
                                children: "Tasks"
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 175,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                className: type === 'projects' ? 'active' : '',
                                onClick: ()=>setType('projects'),
                                children: "Projects"
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 176,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                className: type === 'dreams' ? 'active' : '',
                                onClick: ()=>setType('dreams'),
                                children: "Dreams"
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 177,
                                columnNumber: 11
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                className: type === 'people' ? 'active' : '',
                                onClick: ()=>setType('people'),
                                children: "People"
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 178,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/App.js",
                        lineNumber: 174,
                        columnNumber: 9
                    }, this),
                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "add-bar",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                value: input,
                                onChange: (e)=>setInput(e.target.value),
                                placeholder: `Add a new ${type === 'people' ? 'person' : type.slice(0, -1)}`,
                                onKeyDown: (e)=>e.key === 'Enter' && handleAdd()
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 181,
                                columnNumber: 11
                            }, this),
                            type === 'tasks' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("input", {
                                type: "date",
                                value: dueDate,
                                onChange: (e)=>setDueDate(e.target.value),
                                className: "due-date-input",
                                title: "Due date"
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 188,
                                columnNumber: 13
                            }, this),
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("button", {
                                onClick: handleAdd,
                                children: "Add"
                            }, void 0, false, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 196,
                                columnNumber: 11
                            }, this)
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/App.js",
                        lineNumber: 180,
                        columnNumber: 9
                    }, this),
                    type === 'people' ? /* use the same people-list UI as the task editor */ /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                        className: "people-list task-person-list",
                        children: [
                            /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                className: "task-person-list-header",
                                "aria-hidden": true,
                                children: [
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "task-person-col name",
                                        children: "Name"
                                    }, void 0, false, {
                                        fileName: "[project]/src/App.js",
                                        lineNumber: 203,
                                        columnNumber: 15
                                    }, this),
                                    /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("div", {
                                        className: "task-person-col methods",
                                        children: "Methods"
                                    }, void 0, false, {
                                        fileName: "[project]/src/App.js",
                                        lineNumber: 204,
                                        columnNumber: 15
                                    }, this)
                                ]
                            }, void 0, true, {
                                fileName: "[project]/src/App.js",
                                lineNumber: 202,
                                columnNumber: 13
                            }, this),
                            data.people.map((person, idx)=>/*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$Person$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                                    person: person,
                                    idx: idx,
                                    editingPersonIdx: editingPersonIdx,
                                    editingPersonName: editingPersonName,
                                    setEditingPersonIdx: setEditingPersonIdx,
                                    setEditingPersonName: setEditingPersonName,
                                    onSaveEdit: handleSavePersonEdit,
                                    onCancelEdit: ()=>{
                                        setEditingPersonIdx(null);
                                        setEditingPersonName('');
                                    },
                                    handleTogglePersonDefault: handleTogglePersonDefault,
                                    handleDelete: handleDelete,
                                    asRow: true
                                }, idx, false, {
                                    fileName: "[project]/src/App.js",
                                    lineNumber: 207,
                                    columnNumber: 15
                                }, this))
                        ]
                    }, void 0, true, {
                        fileName: "[project]/src/App.js",
                        lineNumber: 201,
                        columnNumber: 11
                    }, this) : /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])("ul", {
                        className: "item-list",
                        children: /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$TaskList$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                            items: data[type],
                            type: type,
                            editorTaskIdx: editorTaskIdx,
                            setEditorTaskIdx: setEditorTaskIdx,
                            handleToggle: handleToggle,
                            handleStar: handleStar,
                            handleDelete: handleDelete
                        }, void 0, false, {
                            fileName: "[project]/src/App.js",
                            lineNumber: 225,
                            columnNumber: 13
                        }, this)
                    }, void 0, false, {
                        fileName: "[project]/src/App.js",
                        lineNumber: 224,
                        columnNumber: 11
                    }, this)
                ]
            }, void 0, true, {
                fileName: "[project]/src/App.js",
                lineNumber: 169,
                columnNumber: 7
            }, this),
            editorTaskIdx !== null && type === 'tasks' && /*#__PURE__*/ (0, __TURBOPACK__imported__module__$5b$externals$5d2f$react$2f$jsx$2d$dev$2d$runtime__$5b$external$5d$__$28$react$2f$jsx$2d$dev$2d$runtime$2c$__cjs$29$__["jsxDEV"])(__TURBOPACK__imported__module__$5b$project$5d2f$src$2f$TaskModal$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"], {
                task: data.tasks[editorTaskIdx],
                onSave: handleEditorSave,
                onUpdateTask: handleEditorUpdate,
                onClose: handleEditorClose,
                allPeople: data.people || [],
                onOpenPeople: ()=>setType('people'),
                onCreatePerson: (person)=>setData((prev)=>{
                        if (prev.people.find((p)=>p.name === person.name)) return prev;
                        return {
                            ...prev,
                            people: [
                                ...prev.people,
                                {
                                    name: person.name,
                                    methods: person.methods || {
                                        discord: false,
                                        sms: false,
                                        whatsapp: false
                                    }
                                }
                            ]
                        };
                    })
            }, editorTaskIdx, false, {
                fileName: "[project]/src/App.js",
                lineNumber: 238,
                columnNumber: 9
            }, this)
        ]
    }, void 0, true, {
        fileName: "[project]/src/App.js",
        lineNumber: 168,
        columnNumber: 5
    }, this);
}
const __TURBOPACK__default__export__ = App;
}),
"[project]/pages/index.js [ssr] (ecmascript)", ((__turbopack_context__) => {
"use strict";

__turbopack_context__.s([
    "default",
    ()=>__TURBOPACK__default__export__
]);
var __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$App$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__ = __turbopack_context__.i("[project]/src/App.js [ssr] (ecmascript)");
;
const __TURBOPACK__default__export__ = __TURBOPACK__imported__module__$5b$project$5d2f$src$2f$App$2e$js__$5b$ssr$5d$__$28$ecmascript$29$__["default"];
}),
"[externals]/next/dist/shared/lib/no-fallback-error.external.js [external] (next/dist/shared/lib/no-fallback-error.external.js, cjs)", ((__turbopack_context__, module, exports) => {

const mod = __turbopack_context__.x("next/dist/shared/lib/no-fallback-error.external.js", () => require("next/dist/shared/lib/no-fallback-error.external.js"));

module.exports = mod;
}),
];

//# sourceMappingURL=%5Broot-of-the-server%5D__e36dc8e3._.js.map