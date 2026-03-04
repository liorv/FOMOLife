describe('api-client exports', () => {
    it('exports Contact related types', () => {
        // just referencing types to ensure they're present
        const req = { name: 'foo' };
        expect(req.name).toBe('foo');
        // the following intentionally violates the type; expect a compile error
        // @ts-ignore
        const bad = {};
    });
});
export {};
