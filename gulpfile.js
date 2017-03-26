// use node --preserve-symlinks if local gulp is a link

// node --debug-brk %appdata%\npm\node_modules\gulp\bin\gulp.js

var gulp = require('gulp')
var beautify = require('gulp-beautify')
var ext_replace = require('gulp-ext-replace')

var toJson = require('./gulpPlugins/json5Convert').toJson
var toJson5 = require('./gulpPlugins/json5Convert').toJson5

gulp.task('toJSON5', function() {
  return gulp.src('test/json/**/*.json')
    .pipe(toJson5())
    .pipe(beautify({
      "indent_with_tabs": true,
      "indent_size": 2,
    }))
    .pipe(ext_replace('.json5'))
    .pipe(gulp.dest('test/json5'))
})

// gulp.task('toJSON', function() {
//   return gulp.src('test/json5/**/*.json5')
//     .pipe(toJson())
//     .pipe(beautify({
//       "indent_with_tabs": true,
//       "indent_size": 2,
//     }))
//     .pipe(ext_replace('.json'))
//     .pipe(gulp.dest('test/json'))
// })

gulp.task('build', ['toJSON'])
