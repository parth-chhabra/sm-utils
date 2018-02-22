/* eslint-disable guard-for-in */
import EventEmitter from 'events';

const FETCHING = Symbol('Fetching_Value');
let globalCache;

class Cache {
	constructor() {
		this.data = {};
		this.ttl = {};
		this.fetching = {};
		this.events = new EventEmitter();
		this.events.setMaxListeners(20);
	}

	_set(key, value, ttl = 0) {
		if (ttl <= 0) {
			this.data[key] = value;
			return;
		}

		// set value
		this.data[key] = value;

		// set ttl
		clearTimeout(this.ttl[key]);
		this.ttl[key] = setTimeout(() => this.del(key), ttl);
	}

	_del(key) {
		// delete ttl
		if (key in this.ttl) {
			clearTimeout(this.ttl[key]);
			delete this.ttl[key];
		}

		// delete data
		delete this.data[key];
	}

	_clear() {
		// clear ttl
		for (const key in this.ttl) {
			clearTimeout(this.ttl[key]);
		}
		this.ttl = {};

		// clear data
		this.data = {};
		this.fetching = {};
	}

	/**
	 * gets a value from the cache
	 * @param {string} key
	 * @param {any} defaultValue
	 */
	async get(key, defaultValue = undefined) {
		if (this.fetching[key] === FETCHING) {
			// Some other process is still fetching the value
			// Don't dogpile shit, wait for the other process
			// to finish it
			return new Promise((resolve) => {
				this.events.once(`get:${key}`, (val) => {
					if (val === null || val === undefined) resolve(defaultValue);
					else resolve(val);
				});
			});
		}

		const existing = this.data[key];
		if (existing === undefined) return defaultValue;
		return existing;
	}

	/**
	 * gets a value from the cache immediately without waiting
	 * @param {string} key
	 * @param {any} defaultValue
	 */
	async getStale(key, defaultValue = undefined) {
		const existing = this.data[key];
		if (existing === undefined) return defaultValue;
		return existing;
	}

	/**
	 * checks if a key exists in the cache
	 * @param {string} key
	 */
	async has(key) {
		return (key in this.data);
	}

	/**
	 * sets a value in the cache
	 * avoids dogpiling if the value is a promise or a function returning a promise
	 * @param {string} key
	 * @param {any} value
	 * @param {int|object} options either ttl in ms, or object of {ttl}
	 */
	async set(key, value, options = {}) {
		let ttl;
		if (typeof options === 'number') {
			ttl = options;
		}
		else {
			ttl = options.ttl || 0;
		}

		this.fetching[key] = FETCHING;

		try {
			if (value && value.then) {
				// value is a Promise
				// resolve it and then cache it
				const resolvedValue = await value;
				this._set(key, resolvedValue, ttl);
				delete this.fetching[key];
				this.events.emit(`get:${key}`, resolvedValue);
				return true;
			}
			else if (typeof value === 'function') {
				// value is a function
				// call it and set the result
				return this.set(key, value(key), ttl);
			}

			// value is normal
			// just set it in the store
			this._set(key, value, ttl);
			delete this.fetching[key];
			this.events.emit(`get:${key}`, value);
			return true;
		}
		catch (error) {
			this._del(key);
			delete this.fetching[key];
			this.events.emit(`get:${key}`, undefined);
			return false;
		}
	}

	/**
	 * gets a value from the cache, or sets it if it doesn't exist
	 * this takes care of dogpiling (make sure value is a function to avoid dogpiling)
	 * @param {string} key key to get
	 * @param {any} value value to set if the key does not exist
	 * @param {int|object} options either ttl in ms, or object of {ttl}
	 */
	async getOrSet(key, value, options = {}) {
		if (this.fetching[key] === FETCHING) {
			// Some other process is still fetching the value
			// Don't dogpile shit, wait for the other process
			// to finish it
			return new Promise((resolve) => {
				this.events.once(`get:${key}`, (val) => {
					resolve(val);
				});
			});
		}

		// key already exists, return it
		const existing = this.data[key];
		if (existing !== undefined) return existing;

		// no value given, return undefined
		if (value === undefined) return undefined;

		this.fetching[key] = FETCHING;
		await this.set(key, value, options);
		delete this.fetching[key];
		return this.data[key];
	}

	/**
	 * alias for getOrSet
	 */
	async $(key, value, options = {}) {
		return this.getOrSet(key, value, options);
	}

	/**
	 * deletes a value from the cache
	 * @param {string} key
	 */
	async del(key) {
		return this._del(key);
	}

	/**
	 * returns the size of the cache (no. of keys)
	 */
	async size() {
		return Object.keys(this.data).length;
	}

	/**
	 * clears the cache (deletes all keys)
	 */
	async clear() {
		return this._clear();
	}

	/**
	 * Sets the max event listeners for the internal events object
	 * @param {Number} n A non-negative integer
	 */
	setMaxListeners(n) {
		this.events.setMaxListeners(n);
	}

	static globalCache() {
		if (!globalCache) globalCache = new this();
		return globalCache;
	}

	static get(key, defaultValue) {
		return this.globalCache().get(key, defaultValue);
	}

	static getStale(key, defaultValue) {
		return this.globalCache().getStale(key, defaultValue);
	}

	static has(key) {
		return this.globalCache().has(key);
	}

	static set(key, value, options = {}) {
		return this.globalCache().set(key, value, options);
	}

	static getOrSet(key, value, options = {}) {
		return this.globalCache().getOrSet(key, value, options);
	}

	static $(key, value, options = {}) {
		return this.globalCache().getOrSet(key, value, options);
	}

	static del(key) {
		return this.globalCache().del(key);
	}

	static size() {
		return this.globalCache().size();
	}

	static clear() {
		return this.globalCache().clear();
	}
}

export default Cache;
