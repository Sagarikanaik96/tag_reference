frappe.provide("frappe.toolbar");
frappe.provide("tag_workflow");

$(document).bind('toolbar_setup', function() {
        $(".dropdown-help").empty();
        $('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo.png">`);

	frappe.ui.toolbar.route_to_company = function() {
		frappe.set_route('Form', 'Company', frappe.boot.tag.tag_user_info.company);
	};
});

$(document).ready(function(){
	if(frappe.boot && frappe.boot.home_page!=='setup-wizard'){
		$(".main-section").append(frappe.render_template("tag"));
	}
});


frappe.provide("tag_workflow.workflow");
frappe.ui.form.States = Class.extend({
	init: function(opts) {
		$.extend(this, opts);
		this.state_fieldname = frappe.workflow.get_state_fieldname(this.frm.doctype);

		// no workflow?
		if(!this.state_fieldname)
			return;

		this.update_fields = frappe.workflow.get_update_fields(this.frm.doctype);

		var me = this;
		$(this.frm.wrapper).bind("render_complete", function() {
			me.refresh();
		});
	},

	setup_help: function() {
		var me = this;
		this.frm.page.add_action_item(__("Help"), function() {
			frappe.workflow.setup(me.frm.doctype);
			var state = me.get_state();
			var d = new frappe.ui.Dialog({
				title: "Workflow: "
					+ frappe.workflow.workflows[me.frm.doctype].name
			})
			var next_html = $.map(frappe.workflow.get_transitions(me.frm.doctype, state),
				function(r) {
					return r.action.bold() + __(" by Role ") + r.allowed;
				}).join(", ") || __("None: End of Workflow").bold();

			$(d.body).html("<p>"+__("Current status")+": " + state.bold() + "</p>"
				+ "<p>"+__("Document is only editable by users of role")+": "
					+ frappe.workflow.get_document_state(me.frm.doctype,
						state).allow_edit.bold() + "</p>"
				+ "<p>"+__("Next actions")+": "+ next_html +"</p>"
				+ (me.frm.doc.__islocal ? ("<div class='alert alert-info'>"
					+__("Workflow will start after saving.")+"</div>") : "")
				+ "<p class='help'>"+__("Note: Other permission rules may also apply")+"</p>"
				).css({padding: '15px'});
			d.show();
		}, true);
	},

	refresh: function() {
		// hide if its not yet saved
		if(this.frm.doc.__islocal) {
			this.set_default_state();
			return;
		}
		// state text
		var state = this.get_state();

		if(state) {
			// show actions from that state
			this.show_actions(state);
		}

	},

	show_actions: function(state) {
		var added = false;
		var me = this;
		this.frm.page.clear_actions_menu();

		// if the loaded doc is dirty, don't show workflow buttons
		if (this.frm.doc.__unsaved===1) {
			return;
		}

		frappe.workflow.get_transitions(this.frm.doc, state).then(transitions => {
			$.each(transitions, function(i, d) {
				if(frappe.user_roles.includes(d.allowed)) {
					added = true;
					me.frm.page.add_action_item(__(d.action), function() {
						var action = d.action;
						// capture current state
						if(action  == "Reject"){
							me.frm.doc.__tran_state = d;
						}else{
							var doc_before_action = copy_dict(me.frm.doc);
							// set new state
							var next_state = d.next_state;
							me.frm.doc[me.state_fieldname] = next_state;

							var new_state = frappe.workflow.get_document_state(me.frm.doctype, next_state);
							new_state.update_field = me.state_fieldname;
							var new_docstatus = cint(new_state.doc_status);

							if(new_state.update_field) {
								me.frm.set_value(new_state.update_field, "");
								me.frm.set_value(new_state.update_field, new_state.update_value);
								cur_frm.refresh_field(new_state.update_field);
							}

							// revert state on error
							var on_error = function() {
								// reset in locals
								frappe.model.add_to_locals(doc_before_action);
								me.frm.refresh();
							}

							// success - add a comment
							var success = function() {
								console.log("sahil is here");
							}

							me.frm.doc.__tran_state = d;

							if(new_docstatus==1 && me.frm.doc.docstatus==0) {
								me.frm.savesubmit(null, success, on_error);
							} else if(new_docstatus==0 && me.frm.doc.docstatus==0) {
								me.frm.save("Save", success, null, on_error);
							} else if(new_docstatus==1 && me.frm.doc.docstatus==1) {
								me.frm.save("Update", success, null, on_error);
							} else if(new_docstatus==2 && me.frm.doc.docstatus==1) {
								me.frm.savecancel(null, success, on_error);
							} else {
								frappe.msgprint(__("Document Status transition from ") + me.frm.doc.docstatus + " "
									+ __("to") +
									new_docstatus + " " + __("is not allowed."));
								frappe.msgprint(__("Document Status transition from {0} to {1} is not allowed", [me.frm.doc.docstatus, new_docstatus]));
								return 0;
							}
						}
					});
				}
			});
		});

		if(added) {
			this.frm.page.btn_primary.addClass("hide");
			this.frm.toolbar.current_status = "";
			this.setup_help();
		}
	},

	set_default_state: function() {
		var default_state = frappe.workflow.get_default_state(this.frm.doctype, this.frm.doc.docstatus);
		if(default_state) {
			this.frm.set_value(this.state_fieldname, default_state);
		}
	},

	get_state: function() {
		if(!this.frm.doc[this.state_fieldname]) {
			this.set_default_state();
		}
		return this.frm.doc[this.state_fieldname];
	},

	bind_action: function() {
		var me = this;
		this.dropdown.on("click", "[data-action]", function() {
			me._bind = '0'
		})
	},

});
