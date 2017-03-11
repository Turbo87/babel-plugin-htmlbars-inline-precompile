'use strict';

const assert = require('assert');
const path = require('path');

const babel = require('babel-core');
const HTMLBarsInlinePrecompile = require('../index');

describe("htmlbars-inline-precompile", function() {
  let precompile, plugins;

  function transform(code) {
    return babel.transform(code, {
      plugins
    }).code.trim();
  }

  beforeEach(function() {
    precompile = (template) => template.toUpperCase();

    plugins = [
      [HTMLBarsInlinePrecompile, {
        precompile: function() {
          return precompile.apply(this, arguments);
        }
      }],
    ];
  });

  it("strips import statement for 'htmlbars-inline-precompile' module", function() {
    let transformed = transform("import hbs from 'htmlbars-inline-precompile';\nimport Ember from 'ember';");

    assert.equal(transformed, "import Ember from 'ember';", "strips import statement");
  });

  it("throws error when import statement is not using default specifier", function() {
    try {
      transform("import { hbs } from 'htmlbars-inline-precompile'");

      assert.fail("error should have been thrown");
    } catch (e) {
      assert.ok(e.message.match(/Only `import hbs from 'htmlbars-inline-precompile'` is supported/), "needed import syntax is present");
      assert.ok(e.message.match(/You used: `import { hbs } from 'htmlbars-inline-precompile'`/), "used import syntax is present");
    }
  });


  it("replaces tagged template expressions with precompiled version", function() {
    precompile = template => `precompiled(${template})`;

    let transformed = transform("import hbs from 'htmlbars-inline-precompile';\nvar compiled = hbs`hello`;");

    assert.equal(transformed, "var compiled = Ember.HTMLBars.template(precompiled(hello));", "tagged template is replaced");
  });

  it("doesn't replace unrelated tagged template strings", function() {
    precompile = template => `precompiled(${template})`;

    let transformed = transform('import hbs from "htmlbars-inline-precompile";\nvar compiled = anotherTag`hello`;');

    assert.equal(transformed, "var compiled = anotherTag`hello`;", "other tagged template strings are not touched");
  });

  it("warns when the tagged template string contains placeholders", function() {
    assert.throws(function() {
      transform("import hbs from 'htmlbars-inline-precompile';\nvar compiled = hbs`string ${value}`");
    }, /placeholders inside a tagged template string are not supported/);
  });

  describe('caching', function() {
    it('include `baseDir` function for caching', function() {
      assert.equal(HTMLBarsInlinePrecompile.baseDir(), path.resolve(__dirname, '..'));
    });
  });

  describe('single string argument', function() {
    it("works with a plain string as parameter hbs('string')", function() {
      precompile = template => `precompiled(${template})`;

      let transformed = transform("import hbs from 'htmlbars-inline-precompile';\nvar compiled = hbs('hello');");

      assert.equal(transformed, "var compiled = Ember.HTMLBars.template(precompiled(hello));", "tagged template is replaced");
    });

    it("warns when more than one argument is passed", function() {
      assert.throws(function() {
        transform("import hbs from 'htmlbars-inline-precompile';\nvar compiled = hbs('first', 'second');");
      }, /hbs should be invoked with a single argument: the template string/);
    });

    it("warns when argument is not a string", function() {
      assert.throws(function() {
        transform("import hbs from 'htmlbars-inline-precompile';\nvar compiled = hbs(123);");
      }, /hbs should be invoked with a single argument: the template string/);
    });

    it("warns when no argument is passed", function() {
      assert.throws(function() {
        transform("import hbs from 'htmlbars-inline-precompile';\nvar compiled = hbs();");
      }, /hbs should be invoked with a single argument: the template string/);
    });
  });
});
