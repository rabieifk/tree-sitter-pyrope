
//const PREC = { }

//const IDENTIFIER_CHARS = /[^\x00-\x1F\s:;`"'@$#.,|^&<=>+\-*/\\%?!~()\[\]{}]*/;
//const LOWER_ALPHA_CHAR = /[^\x00-\x1F\sA-Z0-9:;`"'@$#.,|^&<=>+\-*/\\%?!~()\[\]{}]/;

module.exports = grammar({
  name: 'pyrope',

  externals: (_) => [],

  extras: $ => [
    / /
    ,/\t/
    , $._comment
  ]

  ,word: $ => $.trivial_identifier

  ,conflicts: $ => [ ] // No conflicts SLR grammar :D

  ,supertypes: $ => [
    //$.stmt_base
    //,$.typecase
  ]

  ,inline: $ => [
    $.comma_tok
    ,$.dot_tok
    ,$.ok_tok
    ,$.ck_tok
    ,$.ob_tok
    ,$.cb_tok
    ,$.op_tok
    ,$.cp_tok
    // ,$.if_elif
    // ,$.else_line
    ,$.expr_logical_cont
    //,$.expr_range_cont
    //,$.expr_cont
    ,$.factor_first
    //,$.factor_second
    ,$.factor_simple
    ,$.factor_simple_fcall
    ,$.tuple_seq
    //,$.stmt_base
  ]

  ,rules: {

    start: $ =>
      seq(
        optional($.stmt_base)
        ,repeat(
          seq(
            $._newline
            ,$.stmt_base
          )
        )
        ,optional($._newline)
      )

    ,stmt_base: $ =>
      choice(
        $.type_stmt
        ,$.while_stmt
        ,$.assign_decl_stmt
        ,$.multiple_stmt
        ,$.tuple_pipe
        ,$.ctrl_stmt
        ,$.scope_pipe_stmt
        ,$.try_stmt
        ,$.factor_expr_stmt
        ,$.expr_range_cont   // open range
        ,$.lambda_def
        ,$.constrained_scope_stmt
      )

    ,gate_stmt: $ =>
      seq(
        choice($.when_tok, $.unless_tok)
        ,field("cond",$.expr_entry)
      )

    ,if_stmt: $ =>
      seq(
        optional($.unique_tok)
        ,$.if_tok
        ,field("cond",$.expr_entry)
        ,field("code",$.scope_stmt)
        ,repeat($.if_elif)
        ,optional($.else_line)
      )

    ,match_stmt: $ =>
      seq(
        $.match_tok
        ,$._expr_seq1
        ,$.ok_tok
        ,repeat($.match_stmt_line)
        ,optional($.match_stmt_else)
        ,$.ck_tok
      )

    ,match_stmt_line: $ =>
      seq(
        optional($._newline)
        ,choice(
          $.expr_logical_cont
          ,field("in",$.in_expr_seq1)
        )
        ,field("code",$.scope_stmt)
      )

    ,match_stmt_else: $ =>
      seq(
        $.else_tok
        ,field("else_code",$.scope_stmt)
      )

    ,if_elif: $ =>
      seq(
        $.elif_tok
        ,field("cond",$.expr_entry)
        ,field("code",$.scope_stmt)
      )

    ,else_line: $ =>
      seq(
        $.else_tok
        ,field("else_code",$.scope_stmt)
      )

    ,while_stmt: $ =>
      seq(
        $.while_tok
        ,field("cond",$.expr_entry)
        ,field("code",$.scope_stmt)
      )

    ,for_stmt: $ =>
      seq(
        $.for_tok
        ,optional($.mut_tok)
        ,$.trivial_identifier  // value
        ,optional(
          seq(
            repeat1($.comma_tok)
            ,field("id2",$.trivial_identifier) // index
            ,optional(
              seq(
                repeat1($.comma_tok)
                ,field("id3",$.trivial_identifier) // key
              )
            )
          )
        )
        ,field("in",$.in_expr_seq1)
        ,field("code",$.scope_stmt)
      )

    ,ctrl_stmt: $ =>
      seq(
        choice(
          $.return_tok
          ,$.continue_tok
          ,$.break_tok
          ,seq(
            choice(
              $.ret_tok
              ,$.cont_tok
              ,$.brk_tok
            )
            ,$._expr_seq1
          )
        )
        ,optional($.gate_stmt)
      )

    ,type_stmt: $ =>
      seq(
        optional($.pub_tok)
        ,$.type_tok
        ,$.trivial_identifier
        ,choice(
          seq(
            $.extends_tok
            ,$.trivial_identifier
            ,$.with_tok
            ,$.tuple
          )
          ,seq(
            $.assignment_cont
            ,optional($.gate_stmt)
          )
        )
      )

    ,start_assign_flags: $ =>
      choice(
        seq(
          choice($.defer_read_tok, $.defer_write_tok)
          ,optional($.pub_tok)
          ,optional($.attributes)
        )
        ,seq(
          $.pub_tok
          ,optional($.attributes)
        )
        ,$.attributes
      )

    // Very close to multiple_stmt
    ,assign_decl_stmt: $ =>
      seq(
        optional($.start_assign_flags)
        ,choice(
          $.enum_tok
          ,$.let_tok
          ,$.reg_tok
          ,$.saturate_tok
          ,$.var_tok
          ,$.wrap_tok
        )
        ,field("lhs",$._expr_seq1)
        ,optional(
          $.assignment_cont2
        )
        ,optional($._assign_multiple_end)
      )

    ,punch_stmt: $ =>
      seq(
        $.punch_tok
        ,$.fcall_or_variable
        ,optional($.typecase)
        ,choice($.from_tok, $.to_tok)
        ,$.expr_entry
      )

    ,tuple_pipe: $ =>
      seq(
        $.tuple
        ,$._assign_multiple_end
      )

    ,multiple_stmt: $ =>
      seq(
        optional($.start_assign_flags)
        ,$.factor_simple_fcall
        ,optional(
          choice(
            seq(
              $.comma_tok
              ,$._expr_simple_seq1
              ,$.assignment_cont2
            )
            ,$._expr_simple_fcall_seq1
            ,repeat1($.expr_cont)
            ,$.assignment_cont2
            ,seq(
              $.fcall_cont
              ,repeat($.expr_cont)
            )
          )
        )
        ,optional($._assign_multiple_end)
      )

    ,_assign_multiple_end: $ =>
      choice(
        repeat1($.fcall_pipe)
        ,$.gate_stmt
      )

    ,fcall_pipe: $ =>
      seq(
        $.pipe_tok
        ,$.factor_second
      )

    ,assignment_cont: $ =>
      seq(
        choice($.equal_tok, $.plusplus_equal_tok)
        ,$.expr_entry
      )

    ,assignment_cont2: $ =>
      seq(
        field("assign",
          choice(
            choice($.equal_tok, $.plusplus_equal_tok)
            ,$.assign_tok
            ,seq(
              $.eq_pound_tok
              ,optional($.selector1)
            )
          )
        )
        ,choice(
          seq(
            $.factor_simple_fcall
            ,$._expr_simple_fcall_seq1
          )
          ,seq(
            $.factor_first
            ,optional(
              choice(
                seq(
                  $.comma_tok
                  ,$._expr_simple_seq1
                )
                ,repeat1($.expr_cont)
              )
            )
          )
        )
      )

    ,scope_stmt: $ =>
      seq(
        optional($.attributes)
        ,$.scope_expr
      )

    ,scope_pipe_stmt: $ =>
      choice(
        seq(
          choice($.defer_read_tok, $.defer_write_tok)
          ,$.scope_stmt
        )
        ,seq(
          $.scope_stmt
          ,repeat(
            seq(
              $.scope_pipe_tok
              ,$.scope_expr
            )
          )
        )
      )

    ,scope_expr: $ =>
      seq(
        $.ok_tok
        ,optional($._newline)
        ,$.stmt_base
        ,repeat(
          seq(
            $._newline
            ,$.stmt_base
          )
        )
        ,$.ck_tok
      )

    ,lambda_def: $ =>
      seq(
        choice($.ok_function_tok, $.ok_procedure_tok)
        ,$.lambda_def_constrains
        ,optional( // lambda can be empty (type def)
          choice(
            $.stmt_base
            ,$.punch_stmt
          )
        )
        ,repeat(
          seq(
            $._newline
            ,choice(
              $.stmt_base
              ,$.punch_stmt
            )
          )
        )
        ,$.ck_tok
      )

    ,try_stmt: $ =>
      seq(
         $.try_tok
        ,field("code",$.scope_stmt)
        ,optional($.else_line)
      )

    ,constrained_scope_stmt: $ =>
      seq(
        $.restrict_tok
        ,choice($.string_literal,$.simple_string_literal)  // ID or explanation
        ,optional($.gate_stmt)
        ,field("code",$.scope_stmt)
      )

    ,expr_simple_entry: $ =>
      seq(
        $.factor_simple
        ,repeat($.expr_cont)
      )

    ,fcall_cont: $ =>
      seq(
        $.tuple
        ,repeat(
          choice(
            $.select_sequence
            ,$.tuple
          )
        )
        ,optional($.variable_base_last)
      )

    ,expr_simple_fcall_entry: $ =>
      seq(
        choice(
          $.factor_simple_fcall
          ,$.lambda_def
        )
        ,optional($.fcall_cont)
        ,repeat($.expr_cont)
      )

    ,expr_cont: $=>
      choice(
        $.expr_range_cont
        ,$.expr_logical_cont
        ,seq(
          $.binary_op_tok
          ,$.factor_second
        )
      )

    ,expr_logical_cont: $ =>
      seq(
        $.logical_op_tok
        ,$.factor_second
      )

    ,expr_range_cont: $ =>
      choice(
        $.range_open_tok
        ,seq(
          $.range_op_tok
          ,$.factor_second
          ,optional(
            seq(
              $.by_tok
              ,$.factor_second
            )
          )
        )
      )

    ,expr_entry: $ =>
      seq(
        $.factor_first
        ,repeat($.expr_cont)
        ,optional($.in_range)
      )

    ,in_range: $ =>
      seq(
        $.in_tok
        ,choice(
          seq(
            $.factor_simple_fcall
            ,optional($.expr_range_cont)
          )
          ,$.tuple
        )
      )

    ,in_expr_seq1: $ =>
      seq(
        $.in_tok
        ,$._expr_seq1
      )

    ,factor_first: $ =>
      choice(
        $.factor_second
        ,$.expr_range_cont   // open range
      )

    ,factor_second: $ =>
      choice(
        $.factor_simple
        ,$.scope_expr
        ,$.factor_expr_stmt
      )

    ,factor_simple: $ =>
      choice(
        $.typecase
        ,seq(
          choice(
            $.lambda_def
            ,$.factor_simple_fcall
          )
          ,optional($.fcall_cont)
        )
      )

    ,factor_simple_fcall: $ =>
      choice(
         seq(
           $.unary_op_tok
           ,$.tuple
         )
        ,seq(
          optional($.unary_op_tok)
          ,$.fcall_or_variable
          ,optional($.typecase)
        )
      )

    ,factor_expr_stmt: $ =>
      choice(
        $.if_stmt
        ,$.for_stmt
        ,$.match_stmt
        ,$.fcall_cont
      )

    ,factor_expr_start: $ =>
      choice(
        $.typecase
        ,$.scope_expr
        ,$.factor_simple_fcall
      )

    ,fcall_or_variable: $ =>
      seq(
        choice(
          $.bool_literal
          ,$.natural_literal
          ,$.string_literal
          ,$.simple_string_literal
          ,$.trivial_identifier
        )
        ,repeat($.select_sequence)
        ,optional($.variable_prev_field)
        ,optional($.variable_base_last)
      )

    ,attributes: $ =>
      choice(
         seq($.comptime_tok, optional($.debug_tok))
        ,$.debug_tok
      )

    ,lambda_def_constrains: $ =>
      seq(
        choice(
          $.trivial_or_caps_identifier_seq1 // just trivial sequence IDs no types no nothing or complex pattern
          ,seq(
            field("generic"
              ,optional(
                seq(
                  optional($._newline)
                  ,$.generic_list
                )
              )
            )
            ,field("capture"
              ,optional(
                seq(
                  optional($._newline)
                  ,$.capture_list
                )
              )
            )
            ,field("input"
              ,optional(
                seq(
                  optional($._newline)
                  ,$.tuple
                )
              )
            )
            ,field("output"
              ,optional(
                seq(
                  optional($._newline)
                  ,$._arrow_tok
                  ,optional($._newline)
                  ,choice(
                    $.tuple
                    ,$.typecase
                  )
                )
              )
            )
            ,optional(
              seq(
                $.where_tok
                ,field("cond",$.expr_entry)
              )
            )
          )
        )
        ,optional($._newline)
        ,$.bar_tok
      )

    ,generic_list: $ =>
      seq(
        $.lt_tok
        ,$.trivial_or_caps_identifier_seq1 // just trivial sequence IDs
        ,$.gt_tok
      )

    ,capture_list: $ =>
      seq(
        $.ob_tok
        ,optional($.tuple_seq)
        ,$.cb_tok
      )

    ,trivial_or_caps_identifier_seq1: $ =>
      seq(
         repeat($.comma_tok)
        ,seq(
          $.trivial_identifier
          ,optional($.typecase)
          ,repeat(
            seq(
               repeat1($.comma_tok)
              ,$.trivial_identifier
              ,optional($.typecase)
            )
          )
        )
        ,repeat($.comma_tok)
      )

    ,typecase: $ =>
      seq(
        $.colon_tok
        ,optional($.qmark_tok)
        ,choice(
          $.lambda_def
          ,repeat1($.selector1)   // untyped Array
          ,$.fcall_or_variable
          // FIXME: $.fcall_cont should work (without last)
          ,seq(
            $.tuple
            ,repeat($.select_sequence)
          )
        )
      )

    ,variable_base_last: $ =>
      choice(
        $.qmark_tok
        // ,$.bang_tok  // CONFLICT
        ,repeat1($.variable_bit_sel)
      )

    ,select_sequence: $ =>
      choice(
        //$.tuple HERE
        seq(
          choice($.qmark_dot_tok, $.dot_tok)
          ,choice($.trivial_identifier, $.natural_literal)
        )
        ,seq(optional($.qmark_tok), $.selector1)
      )

    ,variable_prev_field: $ =>
      seq(
         $.pob_tok
        ,$._expr_seq1
        ,$.cb_tok
      )

    ,selector1: $ =>
      seq(
         $.ob_tok
        ,optional($._expr_seq1)
        ,$.cb_tok
      )

    ,selector0: $ =>
      seq(
         $.ob_tok
        ,$.cb_tok
      )

    ,_expr_seq1: $ =>
      seq(
        repeat($.comma_tok)
        ,seq(
          $.expr_entry
          ,repeat(
            seq(
              repeat1($.comma_tok)
              ,$.expr_entry
            )
          )
        )
      )

    ,_expr_simple_seq1: $ =>
      seq(
        seq(
          $.expr_simple_entry
          ,repeat(
            seq(
              repeat1($.comma_tok)
              ,$.expr_simple_entry
            )
          )
        )
      )

    ,_expr_simple_fcall_seq1: $ =>
      seq(
        $.expr_simple_fcall_entry
        ,repeat(
          seq(
            repeat1($.comma_tok)
            ,$.expr_simple_entry
          )
        )
      )

    ,tuple: $ =>
      seq(
        $.op_tok
        ,optional($.tuple_seq)
        ,$.cp_tok
      )

    ,tuple_seq: $ =>
      choice(
        $._newline
        ,seq(
          repeat($.comma_tok)
          ,seq(
            $.tuple_entry
            ,repeat(
              seq(
                repeat1($.comma_tok)
                ,$.tuple_entry
              )
            )
          )
          ,repeat($.comma_tok)
        )
      )

    ,tuple_entry: $ =>
      choice(
        seq(
          choice($.always_after_tok, $.always_before_tok)
          ,$.assignment_cont
        )
        ,seq(
          optional($.pub_tok)
          ,optional($.attributes)
          ,optional(choice($.var_tok, $.let_tok, $.reg_tok))
          ,field("lhsrhs", $.expr_entry)
          ,optional($.assignment_cont)
        )
        ,seq(
          $.inplace_concat_tok
          ,$.factor_second
        )
      )

    ,variable_bit_sel: $ =>
      seq(
        $.at_tok
        ,optional($.bit_sel_tok)
        ,$.selector1
      )

    ,bit_sel_tok: () => token(choice('sext', 'zext', '|', '&', '^', '+'))

    ,bool_literal: (_) => token(choice("true","false"))
    ,natural_literal: (_) => token(/[0-9][\?\w\d_]*/)

    ,comma_tok: () => seq(/\s*,/)
    ,qmark_dot_tok: () => seq(/\?\./)
    ,dot_tok: () => seq(/\s*\./)

    ,binary_op_tok: () =>
      token(
        seq(
          /\s*/
          ,choice(
            '++' // tuple ops
            ,'+', '-', '*', '/', '|', '&', '^', '<<', '>>' // scalar op
            ,'equals', 'does', 'doesnt' // tuple eq op
          )
        )
      )

    ,def_op_tok: () =>
      token(
        seq(
          /\s*/
          ,choice('++')
        )
      )

    ,logical_op_tok: () =>
      token(
        seq(
          /\s*/
          ,choice(
            'or', 'and', 'or_else', 'and_then', 'has no', 'has', 'implies', '<', '<=', '==', '!=', '>=', '>' // logical op
          )
        )
      )

    ,_arrow_tok: () =>
      token(
        seq(
          /\s*/
          ,'->'
        )
      )


    ,else_tok: () =>
      token(
        seq(
          /\s*/
          ,'else'
        )
      )

    // No spaces before, or alias for new line statement
    ,debug_tok: () => token('debug')
    ,comptime_tok: () => token('comptime')
    ,defer_read_tok: () => token('defer_read')
    ,defer_write_tok: () => token('defer_write')

    ,always_before_tok: () => token('always_before')
    ,always_after_tok: () => token('always_after')

    ,where_tok:    () => token('where'   )
    ,pub_tok:      () => token('pub'     )

    ,enum_tok:     () => token('enum'    )
    ,let_tok:      () => token('let'     )
    ,reg_tok:      () => token('reg'     )
    ,saturate_tok: () => token('saturate')
    ,var_tok:      () => token('var'     )
    ,wrap_tok:     () => token('wrap'    )

    ,punch_tok:    () => token('punch'   )
    ,from_tok:     () => token('from'    )
    ,to_tok:       () => token('to'      )

    ,elif_tok: () =>
      token(
        seq(
          /\s*/
          ,'elif'
        )
      )

    ,by_tok: $ =>
      token(
        seq(
          /\s*/
          ,'by'
        )
      )

    ,in_tok: $ =>
      token(
        seq(
          /\s*/
          ,'in'
        )
      )

    ,unary_op_tok: $ =>
      token(
        seq(
          /\s*/
          ,choice('-', '~', '!', 'not')
        )
      )

    ,restrict_tok: () => token(choice('restrict', 'fail', 'test'))

    ,extends_tok: () => token('extends')
    ,with_tok: () => token('with')

    ,unless_tok: () => token('unless')
    ,when_tok: () => token('when')
    ,to_tok: () => token('to')
    ,if_tok: () => token('if')
    ,unique_tok: () => token('unique')
    ,match_tok: () => token('match')
    ,while_tok: () => token('while')
    ,for_tok: () => token('for')
    ,mut_tok: () => token('mut')

    ,return_tok: () => token('return')
    ,continue_tok: () => token('continue')
    ,break_tok: () => token('break')

    ,ret_tok: () => token('ret')
    ,cont_tok: () => token('cont')
    ,brk_tok: () => token('brk')

    ,type_tok: () => token('type')
    ,try_tok: () => token('try')

    ,inplace_concat_tok: () => token('...')

    ,range_open_tok: () => token('..')
    ,range_op_tok: () =>
      token(
        seq(
          /\s*/
          ,choice('..<', '..=', '..+')
        )
      )

    ,equal_tok: () => token(/\s*=/)
    ,plusplus_equal_tok: () => token(/\s*\+\+=/)

    ,assign_tok: () =>
      token(
        seq(
          /\s*/
          ,choice('+=', '-=', '*=', '/=', '|=', '&=', '^=', 'or=', 'and=', '<<=', '>>=')
        )
      )
    ,eq_pound_tok: () =>
      token(
        seq(
          /\s*/
          ,choice('=#', '++=#', '+=#', '-=#', '*=#', '/=#', '|=#', '&=#', '^=#', 'or=#', 'and=#', '<<=#', '>>=#')
        )
      )

    ,pipe_tok: () => token(/\s*\|>/)
    ,scope_pipe_tok: () => token(/#>/)

    // No ok_tok because it should have space after only if statement (more complicated per rule case)
    ,ok_tok: () => seq('{')
    ,ok_function_tok: () => seq('{|')
    ,ok_procedure_tok: () => seq('#{|')
    ,ck_tok: () => seq(/\s*}/)

    ,ob_tok: () => seq(/\[/) // No newline because the following line may be a expr (not a self-contained statement)
    ,cb_tok: () => seq(/\s*\]/)

    ,lt_tok: () => token('<')
    ,gt_tok: () => seq(/\s*>/)

    ,op_tok: () => seq(/\(/)
    ,cp_tok: () => seq(/\s*\)/)

    ,colon_tok: () => seq(/\s*:/)

    ,bar_tok: () => token('|')
    ,pob_tok: () => token('#[')

    ,qmark_tok: () => token('?')
    ,bang_tok: () => token('!')
    ,at_tok: () => token('@')

    ,simple_string_literal: (_) => token(/\'[^\'\n]*\'/)

    ,string_literal: ($) =>
      seq(
        '"'
        ,repeat(choice($._escape_sequence, /[^"\\\n]+/))
        ,token.immediate('"')
      )

    ,_escape_sequence: (_) => token( prec(1, /\\./))

    ,trivial_identifier: (_) =>
      token(
        choice(
          /[$%a-zA-Z_][a-zA-Z\d_]*/
          ,seq(
            '`'
            ,repeat(choice(prec(1,/\\./), /[^`\\\n]+/))
            ,token.immediate('`')
          )
        )
      )

    //,identifier: (_) => token(/[a-zA-Zα-ωΑ-Ωµ_][\.a-zA-Zα-ωΑ-Ωµ\d_]*/)

    ,_comment: (_) => token(prec(1,/\s*\/\/[^\n]*/))
    ,_newline: (_) => token(prec(-1,/\s*[;\n\r]+/))
  }
});
