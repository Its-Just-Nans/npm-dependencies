
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function svg_element(name) {
        return document.createElementNS('http://www.w3.org/2000/svg', name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        input.value = value == null ? '' : value;
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    let flushing = false;
    const seen_callbacks = new Set();
    function flush() {
        if (flushing)
            return;
        flushing = true;
        do {
            // first, call beforeUpdate functions
            // and update components
            for (let i = 0; i < dirty_components.length; i += 1) {
                const component = dirty_components[i];
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        flushing = false;
        seen_callbacks.clear();
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : options.context || []),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.38.2' }, detail)));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
    }
    function validate_each_argument(arg) {
        if (typeof arg !== 'string' && !(arg && typeof arg === 'object' && 'length' in arg)) {
            let msg = '{#each} only iterates over array-like objects.';
            if (typeof Symbol === 'function' && arg && Symbol.iterator in arg) {
                msg += ' You can use a spread to convert this iterable into an array.';
            }
            throw new Error(msg);
        }
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src\App.svelte generated by Svelte v3.38.2 */

    const { Object: Object_1, console: console_1 } = globals;
    const file = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = ctx.slice();
    	child_ctx[11] = list[i];
    	child_ctx[13] = i;
    	return child_ctx;
    }

    // (160:4) {:else}
    function create_else_block(ctx) {
    	let p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Loading...";
    			set_style(p, "font-weight", "bold");
    			add_location(p, file, 160, 5, 3809);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},
    		p: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_else_block.name,
    		type: "else",
    		source: "(160:4) {:else}",
    		ctx
    	});

    	return block;
    }

    // (141:4) {#if working != true}
    function create_if_block_3(ctx) {
    	let label0;
    	let t1;
    	let input0;
    	let t2;
    	let br0;
    	let t3;
    	let label1;
    	let t5;
    	let input1;
    	let t6;
    	let br1;
    	let t7;
    	let br2;
    	let t8;
    	let button;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			label0.textContent = "Output filename";
    			t1 = space();
    			input0 = element("input");
    			t2 = space();
    			br0 = element("br");
    			t3 = space();
    			label1 = element("label");
    			label1.textContent = "Do devDependencies";
    			t5 = space();
    			input1 = element("input");
    			t6 = space();
    			br1 = element("br");
    			t7 = space();
    			br2 = element("br");
    			t8 = space();
    			button = element("button");
    			button.textContent = "Send";
    			attr_dev(label0, "for", "outputFilename");
    			add_location(label0, file, 141, 5, 3348);
    			attr_dev(input0, "type", "text");
    			add_location(input0, file, 142, 5, 3405);
    			add_location(br0, file, 143, 5, 3460);
    			attr_dev(label1, "for", "doDependencies");
    			add_location(label1, file, 144, 5, 3472);
    			attr_dev(input1, "type", "checkbox");
    			add_location(input1, file, 145, 5, 3532);
    			add_location(br1, file, 151, 5, 3648);
    			add_location(br2, file, 152, 5, 3660);
    			add_location(button, file, 153, 5, 3672);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			insert_dev(target, t1, anchor);
    			insert_dev(target, input0, anchor);
    			set_input_value(input0, /*outputFilename*/ ctx[2]);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, br0, anchor);
    			insert_dev(target, t3, anchor);
    			insert_dev(target, label1, anchor);
    			insert_dev(target, t5, anchor);
    			insert_dev(target, input1, anchor);
    			insert_dev(target, t6, anchor);
    			insert_dev(target, br1, anchor);
    			insert_dev(target, t7, anchor);
    			insert_dev(target, br2, anchor);
    			insert_dev(target, t8, anchor);
    			insert_dev(target, button, anchor);

    			if (!mounted) {
    				dispose = [
    					listen_dev(input0, "input", /*input0_input_handler*/ ctx[8]),
    					listen_dev(input1, "click", /*click_handler*/ ctx[9], false, false, false),
    					listen_dev(button, "click", /*click_handler_1*/ ctx[10], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*outputFilename*/ 4 && input0.value !== /*outputFilename*/ ctx[2]) {
    				set_input_value(input0, /*outputFilename*/ ctx[2]);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(label0);
    			if (detaching) detach_dev(t1);
    			if (detaching) detach_dev(input0);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(br0);
    			if (detaching) detach_dev(t3);
    			if (detaching) detach_dev(label1);
    			if (detaching) detach_dev(t5);
    			if (detaching) detach_dev(input1);
    			if (detaching) detach_dev(t6);
    			if (detaching) detach_dev(br1);
    			if (detaching) detach_dev(t7);
    			if (detaching) detach_dev(br2);
    			if (detaching) detach_dev(t8);
    			if (detaching) detach_dev(button);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_3.name,
    		type: "if",
    		source: "(141:4) {#if working != true}",
    		ctx
    	});

    	return block;
    }

    // (189:44) 
    function create_if_block_2(ctx) {
    	let p;
    	let t0_value = /*oneError*/ ctx[11].name + "";
    	let t0;
    	let t1;
    	let t2;
    	let a;
    	let t3_value = /*oneError*/ ctx[11].repository + "";
    	let t3;
    	let a_href_value;
    	let t4;
    	let hr;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t0 = text(t0_value);
    			t1 = text(" -");
    			t2 = space();
    			a = element("a");
    			t3 = text(t3_value);
    			t4 = space();
    			hr = element("hr");
    			set_style(p, "font-weight", "bold");
    			attr_dev(p, "class", "red svelte-eepomh");
    			add_location(p, file, 189, 6, 4592);
    			attr_dev(a, "href", a_href_value = /*oneError*/ ctx[11].repository);
    			add_location(a, file, 192, 6, 4675);
    			add_location(hr, file, 193, 6, 4737);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t0);
    			append_dev(p, t1);
    			insert_dev(target, t2, anchor);
    			insert_dev(target, a, anchor);
    			append_dev(a, t3);
    			insert_dev(target, t4, anchor);
    			insert_dev(target, hr, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errors*/ 16 && t0_value !== (t0_value = /*oneError*/ ctx[11].name + "")) set_data_dev(t0, t0_value);
    			if (dirty & /*errors*/ 16 && t3_value !== (t3_value = /*oneError*/ ctx[11].repository + "")) set_data_dev(t3, t3_value);

    			if (dirty & /*errors*/ 16 && a_href_value !== (a_href_value = /*oneError*/ ctx[11].repository)) {
    				attr_dev(a, "href", a_href_value);
    			}
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    			if (detaching) detach_dev(t2);
    			if (detaching) detach_dev(a);
    			if (detaching) detach_dev(t4);
    			if (detaching) detach_dev(hr);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_2.name,
    		type: "if",
    		source: "(189:44) ",
    		ctx
    	});

    	return block;
    }

    // (187:5) {#if typeof oneError === "string"}
    function create_if_block_1(ctx) {
    	let p;
    	let t_value = /*oneError*/ ctx[11] + "";
    	let t;

    	const block = {
    		c: function create() {
    			p = element("p");
    			t = text(t_value);
    			set_style(p, "font-weight", "bold");
    			attr_dev(p, "class", "red svelte-eepomh");
    			add_location(p, file, 187, 6, 4486);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*errors*/ 16 && t_value !== (t_value = /*oneError*/ ctx[11] + "")) set_data_dev(t, t_value);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(p);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block_1.name,
    		type: "if",
    		source: "(187:5) {#if typeof oneError === \\\"string\\\"}",
    		ctx
    	});

    	return block;
    }

    // (186:4) {#each errors as oneError, i}
    function create_each_block(ctx) {
    	let if_block_anchor;

    	function select_block_type_1(ctx, dirty) {
    		if (typeof /*oneError*/ ctx[11] === "string") return create_if_block_1;
    		if (typeof /*oneError*/ ctx[11] === "object") return create_if_block_2;
    	}

    	let current_block_type = select_block_type_1(ctx);
    	let if_block = current_block_type && current_block_type(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    		},
    		p: function update(ctx, dirty) {
    			if (current_block_type === (current_block_type = select_block_type_1(ctx)) && if_block) {
    				if_block.p(ctx, dirty);
    			} else {
    				if (if_block) if_block.d(1);
    				if_block = current_block_type && current_block_type(ctx);

    				if (if_block) {
    					if_block.c();
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			}
    		},
    		d: function destroy(detaching) {
    			if (if_block) {
    				if_block.d(detaching);
    			}

    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_each_block.name,
    		type: "each",
    		source: "(186:4) {#each errors as oneError, i}",
    		ctx
    	});

    	return block;
    }

    // (201:4) {#if resultString !== ""}
    function create_if_block(ctx) {
    	let pre;
    	let t;

    	const block = {
    		c: function create() {
    			pre = element("pre");
    			t = text(/*resultString*/ ctx[1]);
    			attr_dev(pre, "class", "pre-res svelte-eepomh");
    			add_location(pre, file, 201, 5, 4846);
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, pre, anchor);
    			append_dev(pre, t);
    		},
    		p: function update(ctx, dirty) {
    			if (dirty & /*resultString*/ 2) set_data_dev(t, /*resultString*/ ctx[1]);
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(pre);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(201:4) {#if resultString !== \\\"\\\"}",
    		ctx
    	});

    	return block;
    }

    function create_fragment(ctx) {
    	let div;
    	let h1;
    	let t1;
    	let p0;
    	let t3;
    	let a0;
    	let p1;
    	let t5;
    	let img;
    	let img_src_value;
    	let t6;
    	let p2;
    	let t8;
    	let a1;
    	let p3;
    	let t10;
    	let svg;
    	let title;
    	let t11;
    	let path;
    	let t12;
    	let p4;
    	let t14;
    	let p5;
    	let t15;
    	let a2;
    	let t17;
    	let table;
    	let thead;
    	let tr0;
    	let th;
    	let textarea;
    	let t18;
    	let br;
    	let t19;
    	let t20;
    	let tbody;
    	let tr1;
    	let td0;
    	let h20;
    	let t22;
    	let td1;
    	let h21;
    	let t24;
    	let td2;
    	let h22;
    	let t26;
    	let tr2;
    	let td3;
    	let pre0;
    	let t27_value = JSON.stringify(/*parsed*/ ctx[0].dependencies, null, 4) + "";
    	let t27;
    	let t28;
    	let td4;
    	let pre1;
    	let t29_value = JSON.stringify(/*parsed*/ ctx[0].devDependencies, null, 4) + "";
    	let t29;
    	let t30;
    	let td5;
    	let t31;
    	let tr3;
    	let td6;
    	let mounted;
    	let dispose;

    	function select_block_type(ctx, dirty) {
    		if (/*working*/ ctx[5] != true) return create_if_block_3;
    		return create_else_block;
    	}

    	let current_block_type = select_block_type(ctx);
    	let if_block0 = current_block_type(ctx);
    	let each_value = /*errors*/ ctx[4];
    	validate_each_argument(each_value);
    	let each_blocks = [];

    	for (let i = 0; i < each_value.length; i += 1) {
    		each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
    	}

    	let if_block1 = /*resultString*/ ctx[1] !== "" && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			div = element("div");
    			h1 = element("h1");
    			h1.textContent = "NPM License Dependencies";
    			t1 = space();
    			p0 = element("p");
    			p0.textContent = "Made with";
    			t3 = space();
    			a0 = element("a");
    			p1 = element("p");
    			p1.textContent = "Svelte";
    			t5 = space();
    			img = element("img");
    			t6 = space();
    			p2 = element("p");
    			p2.textContent = "and";
    			t8 = space();
    			a1 = element("a");
    			p3 = element("p");
    			p3.textContent = "Vercel";
    			t10 = space();
    			svg = svg_element("svg");
    			title = svg_element("title");
    			t11 = text("Vercel Logo");
    			path = svg_element("path");
    			t12 = space();
    			p4 = element("p");
    			p4.textContent = "!";
    			t14 = space();
    			p5 = element("p");
    			t15 = text("Check code ");
    			a2 = element("a");
    			a2.textContent = "here";
    			t17 = space();
    			table = element("table");
    			thead = element("thead");
    			tr0 = element("tr");
    			th = element("th");
    			textarea = element("textarea");
    			t18 = space();
    			br = element("br");
    			t19 = space();
    			if_block0.c();
    			t20 = space();
    			tbody = element("tbody");
    			tr1 = element("tr");
    			td0 = element("td");
    			h20 = element("h2");
    			h20.textContent = "dependencies";
    			t22 = space();
    			td1 = element("td");
    			h21 = element("h2");
    			h21.textContent = "devDependencies";
    			t24 = space();
    			td2 = element("td");
    			h22 = element("h2");
    			h22.textContent = "Errors";
    			t26 = space();
    			tr2 = element("tr");
    			td3 = element("td");
    			pre0 = element("pre");
    			t27 = text(t27_value);
    			t28 = space();
    			td4 = element("td");
    			pre1 = element("pre");
    			t29 = text(t29_value);
    			t30 = space();
    			td5 = element("td");

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			t31 = space();
    			tr3 = element("tr");
    			td6 = element("td");
    			if (if_block1) if_block1.c();
    			add_location(h1, file, 95, 1, 2327);
    			attr_dev(p0, "class", "inline svelte-eepomh");
    			add_location(p0, file, 96, 1, 2362);
    			attr_dev(p1, "class", "inline svelte-eepomh");
    			add_location(p1, file, 103, 2, 2487);
    			attr_dev(img, "class", "inline logo svelte-eepomh");
    			if (img.src !== (img_src_value = "https://svelte.dev/favicon.png")) attr_dev(img, "src", img_src_value);
    			attr_dev(img, "alt", "");
    			add_location(img, file, 104, 2, 2518);
    			set_style(a0, "color", "orange");
    			attr_dev(a0, "class", "link svelte-eepomh");
    			attr_dev(a0, "href", "https://svelte.dev");
    			attr_dev(a0, "target", "_blank");
    			add_location(a0, file, 97, 1, 2395);
    			attr_dev(p2, "class", "inline svelte-eepomh");
    			add_location(p2, file, 106, 1, 2597);
    			attr_dev(p3, "class", "inline svelte-eepomh");
    			add_location(p3, file, 108, 2, 2686);
    			add_location(title, file, 114, 4, 2824);
    			attr_dev(path, "d", "M37.59.25l36.95 64H.64l36.95-64z");
    			add_location(path, file, 114, 30, 2850);
    			attr_dev(svg, "class", "inline logo svelte-eepomh");
    			set_style(svg, "vertical-align", "text-top");
    			attr_dev(svg, "height", "26");
    			attr_dev(svg, "viewBox", "0 0 75 65");
    			add_location(svg, file, 109, 2, 2717);
    			attr_dev(a1, "href", "https://vercel.com/");
    			attr_dev(a1, "class", "link svelte-eepomh");
    			attr_dev(a1, "target", "_blank");
    			add_location(a1, file, 107, 1, 2624);
    			attr_dev(p4, "class", "inline svelte-eepomh");
    			add_location(p4, file, 119, 1, 2919);
    			attr_dev(a2, "class", "link svelte-eepomh");
    			attr_dev(a2, "href", "https://github.com/Its-Just-Nans/npm-license-dependencies");
    			add_location(a2, file, 121, 13, 2976);
    			attr_dev(p5, "class", "inline svelte-eepomh");
    			add_location(p5, file, 120, 1, 2944);
    			set_style(div, "text-align", "center");
    			add_location(div, file, 94, 0, 2292);
    			attr_dev(textarea, "id", "textarea");
    			attr_dev(textarea, "placeholder", "Your package.json here");
    			attr_dev(textarea, "class", "svelte-eepomh");
    			add_location(textarea, file, 132, 4, 3140);
    			add_location(br, file, 139, 4, 3310);
    			attr_dev(th, "colspan", "3");
    			add_location(th, file, 131, 3, 3119);
    			add_location(tr0, file, 130, 2, 3111);
    			add_location(thead, file, 129, 1, 3101);
    			attr_dev(h20, "class", "titleCol svelte-eepomh");
    			add_location(h20, file, 168, 4, 3956);
    			attr_dev(td0, "class", "results svelte-eepomh");
    			add_location(td0, file, 167, 3, 3931);
    			attr_dev(h21, "class", "titleCol svelte-eepomh");
    			add_location(h21, file, 171, 4, 4032);
    			attr_dev(td1, "class", "results svelte-eepomh");
    			add_location(td1, file, 170, 3, 4007);
    			attr_dev(h22, "class", "titleCol svelte-eepomh");
    			add_location(h22, file, 174, 4, 4111);
    			attr_dev(td2, "class", "results svelte-eepomh");
    			add_location(td2, file, 173, 3, 4086);
    			set_style(tr1, "display", "flex");
    			add_location(tr1, file, 166, 2, 3902);
    			add_location(pre0, file, 179, 4, 4217);
    			attr_dev(td3, "class", "results svelte-eepomh");
    			add_location(td3, file, 178, 3, 4192);
    			add_location(pre1, file, 182, 4, 4312);
    			attr_dev(td4, "class", "results svelte-eepomh");
    			add_location(td4, file, 181, 3, 4287);
    			attr_dev(td5, "class", "results svelte-eepomh");
    			add_location(td5, file, 184, 3, 4385);
    			set_style(tr2, "display", "flex");
    			add_location(tr2, file, 177, 2, 4163);
    			attr_dev(td6, "colspan", "3");
    			add_location(td6, file, 199, 3, 4794);
    			add_location(tr3, file, 198, 2, 4786);
    			add_location(tbody, file, 165, 1, 3892);
    			attr_dev(table, "class", "svelte-eepomh");
    			add_location(table, file, 128, 0, 3092);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, h1);
    			append_dev(div, t1);
    			append_dev(div, p0);
    			append_dev(div, t3);
    			append_dev(div, a0);
    			append_dev(a0, p1);
    			append_dev(a0, t5);
    			append_dev(a0, img);
    			append_dev(div, t6);
    			append_dev(div, p2);
    			append_dev(div, t8);
    			append_dev(div, a1);
    			append_dev(a1, p3);
    			append_dev(a1, t10);
    			append_dev(a1, svg);
    			append_dev(svg, title);
    			append_dev(title, t11);
    			append_dev(svg, path);
    			append_dev(div, t12);
    			append_dev(div, p4);
    			append_dev(div, t14);
    			append_dev(div, p5);
    			append_dev(p5, t15);
    			append_dev(p5, a2);
    			insert_dev(target, t17, anchor);
    			insert_dev(target, table, anchor);
    			append_dev(table, thead);
    			append_dev(thead, tr0);
    			append_dev(tr0, th);
    			append_dev(th, textarea);
    			append_dev(th, t18);
    			append_dev(th, br);
    			append_dev(th, t19);
    			if_block0.m(th, null);
    			append_dev(table, t20);
    			append_dev(table, tbody);
    			append_dev(tbody, tr1);
    			append_dev(tr1, td0);
    			append_dev(td0, h20);
    			append_dev(tr1, t22);
    			append_dev(tr1, td1);
    			append_dev(td1, h21);
    			append_dev(tr1, t24);
    			append_dev(tr1, td2);
    			append_dev(td2, h22);
    			append_dev(tbody, t26);
    			append_dev(tbody, tr2);
    			append_dev(tr2, td3);
    			append_dev(td3, pre0);
    			append_dev(pre0, t27);
    			append_dev(tr2, t28);
    			append_dev(tr2, td4);
    			append_dev(td4, pre1);
    			append_dev(pre1, t29);
    			append_dev(tr2, t30);
    			append_dev(tr2, td5);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(td5, null);
    			}

    			append_dev(tbody, t31);
    			append_dev(tbody, tr3);
    			append_dev(tr3, td6);
    			if (if_block1) if_block1.m(td6, null);

    			if (!mounted) {
    				dispose = [
    					listen_dev(textarea, "change", /*handleChange*/ ctx[7], false, false, false),
    					listen_dev(textarea, "click", /*handleChange*/ ctx[7], false, false, false),
    					listen_dev(textarea, "keyup", /*handleChange*/ ctx[7], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
    				if_block0.p(ctx, dirty);
    			} else {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);

    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(th, null);
    				}
    			}

    			if (dirty & /*parsed*/ 1 && t27_value !== (t27_value = JSON.stringify(/*parsed*/ ctx[0].dependencies, null, 4) + "")) set_data_dev(t27, t27_value);
    			if (dirty & /*parsed*/ 1 && t29_value !== (t29_value = JSON.stringify(/*parsed*/ ctx[0].devDependencies, null, 4) + "")) set_data_dev(t29, t29_value);

    			if (dirty & /*errors*/ 16) {
    				each_value = /*errors*/ ctx[4];
    				validate_each_argument(each_value);
    				let i;

    				for (i = 0; i < each_value.length; i += 1) {
    					const child_ctx = get_each_context(ctx, each_value, i);

    					if (each_blocks[i]) {
    						each_blocks[i].p(child_ctx, dirty);
    					} else {
    						each_blocks[i] = create_each_block(child_ctx);
    						each_blocks[i].c();
    						each_blocks[i].m(td5, null);
    					}
    				}

    				for (; i < each_blocks.length; i += 1) {
    					each_blocks[i].d(1);
    				}

    				each_blocks.length = each_value.length;
    			}

    			if (/*resultString*/ ctx[1] !== "") {
    				if (if_block1) {
    					if_block1.p(ctx, dirty);
    				} else {
    					if_block1 = create_if_block(ctx);
    					if_block1.c();
    					if_block1.m(td6, null);
    				}
    			} else if (if_block1) {
    				if_block1.d(1);
    				if_block1 = null;
    			}
    		},
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			if (detaching) detach_dev(t17);
    			if (detaching) detach_dev(table);
    			if_block0.d();
    			destroy_each(each_blocks, detaching);
    			if (if_block1) if_block1.d();
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots("App", slots, []);
    	let parsed = { dependencies: {}, devDependencies: {} };
    	let resultString = "";
    	let outputFilename = "";
    	let doDependencies = false;
    	let errors = [];
    	let working = false;

    	const handleSubmit = function () {
    		handleChange();
    		let object = {};

    		if (parsed.dependencies && Object.keys(parsed.dependencies).length > 0) {
    			object.dependencies = parsed.dependencies;

    			if (doDependencies && parsed.devDependencies && Object.keys(parsed.devDependencies).length > 0) {
    				object.devDependencies = parsed.devDependencies;
    			}
    		} else {
    			$$invalidate(4, errors = ["dependencies not found"]);
    			return;
    		}

    		$$invalidate(5, working = true);

    		fetch("/api/", {
    			method: "POST",
    			body: JSON.stringify(object)
    		}).then(response => {
    			$$invalidate(5, working = false);

    			if (response.status == 200) {
    				response.json().then(resp => {
    					if (typeof resp !== "object") {
    						try {
    							resp = JSON.parse(resp);
    						} catch(e) {
    							
    						}
    					}

    					if (resp.text) {
    						console.log(resp.text);
    					}

    					if (resp.errors) {
    						$$invalidate(4, errors = resp.errors);
    					}

    					if (resp.dependencies && resp.dependencies.length > 0) {
    						let data = "";

    						for (const oneDep of resp.dependencies) {
    							data += `\n${oneDep.name} - ${oneDep.npmLicense}\n${oneDep.repository}\n\n`;
    							data += `${oneDep.license}\n`;
    						}

    						$$invalidate(1, resultString = data);

    						// https://stackoverflow.com/a/33542499/15568835
    						var blob = new Blob([data], { type: "text/csv" });

    						if (window.navigator.msSaveOrOpenBlob) {
    							window.navigator.msSaveBlob(blob, filename);
    						} else {
    							var elem = window.document.createElement("a");
    							elem.href = window.URL.createObjectURL(blob);

    							if (outputFilename !== null && outputFilename.trim() !== "") {
    								elem.download = outputFilename;
    							} else {
    								elem.download = "ALL_LICENSE";
    							}

    							document.body.appendChild(elem);
    							elem.click();
    							document.body.removeChild(elem);
    						}
    					}
    				});
    			}
    		});
    	};

    	const handleChange = () => {
    		try {
    			$$invalidate(0, parsed = JSON.parse(document.getElementById("textarea").value));
    			$$invalidate(4, errors = []);
    		} catch(e) {
    			$$invalidate(4, errors = ["Error with JSON.parse"]);
    			$$invalidate(0, parsed = { dependencies: {}, devDependencies: {} });
    		}
    	};

    	const writable_props = [];

    	Object_1.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== "$$") console_1.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	function input0_input_handler() {
    		outputFilename = this.value;
    		$$invalidate(2, outputFilename);
    	}

    	const click_handler = () => {
    		$$invalidate(3, doDependencies = !doDependencies);
    	};

    	const click_handler_1 = event => {
    		event.preventDefault();
    		handleSubmit();
    	};

    	$$self.$capture_state = () => ({
    		parsed,
    		resultString,
    		outputFilename,
    		doDependencies,
    		errors,
    		working,
    		handleSubmit,
    		handleChange
    	});

    	$$self.$inject_state = $$props => {
    		if ("parsed" in $$props) $$invalidate(0, parsed = $$props.parsed);
    		if ("resultString" in $$props) $$invalidate(1, resultString = $$props.resultString);
    		if ("outputFilename" in $$props) $$invalidate(2, outputFilename = $$props.outputFilename);
    		if ("doDependencies" in $$props) $$invalidate(3, doDependencies = $$props.doDependencies);
    		if ("errors" in $$props) $$invalidate(4, errors = $$props.errors);
    		if ("working" in $$props) $$invalidate(5, working = $$props.working);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		parsed,
    		resultString,
    		outputFilename,
    		doDependencies,
    		errors,
    		working,
    		handleSubmit,
    		handleChange,
    		input0_input_handler,
    		click_handler,
    		click_handler_1
    	];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
