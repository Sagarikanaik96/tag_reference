frappe.ui.form.on("Company", {
  refresh: function (frm) {
    cur_frm.clear_custom_buttons();
    init_values(frm);
    hide_connections(frm);
    hide_details(frm);
    update_company_fields(frm);
    jazzhr_data(frm);
    make_invoice(frm); 
    uploaded_file_format(frm);
    if (frappe.user.has_role("Tag Admin")) {
      frm.set_df_property("employees", "read_only", 1);
    }
    if (!frappe.user.has_role("Tag Admin")) {
      frm.set_df_property("make_organization_inactive", "hidden", 1);
	  frm.set_df_property("make_organization_inactive", "read_only", 1);
    }

    if (frm.doc.__islocal == 1) {
      $('div[data-fieldname="average_rating"]').css("display", "none");
      cancel_company(frm);
    }
  },
  setup: function (frm) {
    init_values(frm);

    let ORG = "Organization Type";
    frm.set_query("organization_type", function (doc) {
      if (frappe.user_roles.includes("Tag Admin")) {
        return {
          filters: [[ORG, "name", "!=", "TAG"]],
        };
      } else if (frappe.user_roles.includes("Staffing Admin")) {
        return {
          filters: [[ORG, "name", "=", "Exclusive Hiring"]],
        };
      } else if (frappe.user_roles.includes("Hiring Admin")) {
        return {
          filters: [[ORG, "name", "=", "Hiring"]],
        };
      }
    });

    frm.set_query("parent_staffing", function (doc) {
      return {
        filters: [
          ["Company", "organization_type", "=", "Staffing"],
          ["Company", "make_organization_inactive", "=", 0],
        ],
      };
    });
  },
  set_primary_contact_as_account_receivable_contact: function (frm) {
    if (cur_frm.doc.set_primary_contact_as_account_receivable_contact == 1) {
      if (
        cur_frm.doc.contact_name &&
        cur_frm.doc.phone_no &&
        cur_frm.doc.email
      ) {
        cur_frm.set_value("accounts_receivable_name", cur_frm.doc.contact_name);
        cur_frm.set_value("accounts_receivable_rep_email", cur_frm.doc.email);
        cur_frm.set_value(
          "accounts_receivable_phone_number",
          cur_frm.doc.phone_no
        );
      } else {
        msgprint("You Can't set Primary Contact unless your value are filled");
        cur_frm.set_value(
          "set_primary_contact_as_account_receivable_contact",
          0
        );
      }
    } else {
      cur_frm.set_value("accounts_receivable_name", "");
      cur_frm.set_value("accounts_receivable_rep_email", "");
      cur_frm.set_value("accounts_receivable_phone_number", "");
    }
  },
  set_primary_contact_as_account_payable_contact: function (frm) {
    if (cur_frm.doc.set_primary_contact_as_account_payable_contact == 1) {
      if (
        cur_frm.doc.contact_name &&
        cur_frm.doc.phone_no &&
        cur_frm.doc.email
      ) {
        cur_frm.set_value(
          "accounts_payable_contact_name",
          cur_frm.doc.contact_name
        );
        cur_frm.set_value("accounts_payable_email", cur_frm.doc.email);
        cur_frm.set_value(
          "accounts_payable_phone_number",
          cur_frm.doc.phone_no
        );
      } else {
        msgprint("You Can't set Primary Contact unless your value are filled");
        cur_frm.set_value("set_primary_contact_as_account_payable_contact", 0);
      }
    } else {
      cur_frm.set_value("accounts_payable_contact_name", "");
      cur_frm.set_value("accounts_payable_email", "");
      cur_frm.set_value("accounts_payable_phone_number", "");
    }
  },

  after_save: function (frm) {
    frappe.call({
      method:
        "tag_workflow.controllers.master_controller.make_update_comp_perm",
      args: { docname: frm.doc.name },
    });
  },

  validate: function (frm) {
    validate_phone_and_zip(frm);

    let phone_no = frm.doc.accounts_payable_phone_number || "";
    let account_phone_no=frm.doc.accounts_receivable_phone_number || "";
    let email = frm.doc.email;
    let receive_email = frm.doc.accounts_receivable_rep_email;
    let pay_email = frm.doc.accounts_payable_email;
    var letters = /^[A-Za-z]+$/


    if (email && (email.length > 120 || !frappe.utils.validate_type(email, "email"))){
        frappe.msgprint({message: __('Not A Valid Email'), indicator: 'red'})
        frappe.validated = false

    }
		if (phone_no && (phone_no.length != 10 || isNaN(phone_no)) || phone_no.match(letters)){
			frappe.msgprint({message: __('Not Valid Accounts Payable phone number'), indicator: 'red'})
			frappe.validated = false
    }
    if (account_phone_no && (account_phone_no.length != 10 || isNaN(account_phone_no)) || account_phone_no.match(letters)){
			frappe.msgprint({message: __('Not Valid Accounts Receivable phone number'), indicator: 'red'})
			frappe.validated = false
    }
    if (receive_email && (receive_email.length > 120 || !frappe.utils.validate_type(receive_email, "email"))){
      frappe.msgprint({message: __('Not A Valid Accounts Receivable Email'), indicator: 'red'})
      frappe.validated = false
    }
    if (pay_email && (pay_email.length > 120 || !frappe.utils.validate_type(pay_email, "email"))){
      frappe.msgprint({message: __('Not A Valid Accounts Payable Email'), indicator: 'red'})
      frappe.validated = false
    }
  },

  make_organization_inactive(frm) {
    frappe.call({
      method: "tag_workflow.tag_data.disable_user",
      args: {
        company: cur_frm.doc.company_name,
        check: cur_frm.doc.make_organization_inactive,
      },
    });
  },

  click_here: function (frm) {
    if (frm.doc.organization_type == "Hiring") {
      frappe.set_route("Form", "Hiring Company Review");
    } else {
      frappe.set_route("Form", "Company Review");
    }
  },
  onload: function (frm) {
    cur_frm.fields_dict["employees"].grid.get_field("employee").get_query =
      function (doc, cdt, cdn) {
        return {
          query: "tag_workflow.tag_data.filter_company_employee",
          filters: {
            company: doc.name,
          },
        };
      };
  },
});

/*---------hide details----------*/
function hide_details(frm) {
  let fields = [
    "charts_section",
    "sales_settings",
    "default_settings",
    "section_break_22",
    "auto_accounting_for_stock_settings",
    "fixed_asset_defaults",
    "non_profit_section",
    "hra_section",
    "budget_detail",
    "company_logo",
    "date_of_incorporation",
    "address_html",
    "date_of_commencement",
    "fax",
    "website",
    "company_description",
    "registration_info",
    "domain",
    "parent_company",
    "is_group",
    "industry",
    "abbr",
    "change_abbr",
  ];
  for (let data in fields) {
    cur_frm.toggle_display(fields[data], 0);
  }
}

/*----------init values-----------*/
function init_values(frm) {
  if (cur_frm.doc.__islocal == 1) {
    $(".page-title .title-area .title-text").css("cursor", "auto");
    var company_data = {
      default_currency: "USD",
      country: "United States",
      create_chart_of_accounts_based_on: "Standard Template",
      chart_of_accounts: "Standard with Numbers",
      parent_staffing: "",
    };
    var keys = Object.keys(company_data);
    for (var val in keys) {
      cur_frm.set_value(keys[val], company_data[keys[val]]);
      cur_frm.toggle_enable(keys[val], 0);
    }
  } else {
    $(".page-title .title-area .title-text").css("cursor", "pointer");
  }
}

/*----update field properity-----*/
function update_company_fields(frm) {
  let roles = frappe.user_roles;
  let is_local = cur_frm.doc.__islocal;
  let company_fields = [
    "organization_type",
    "country",
    "industry",
    "default_currency",
    "parent_staffing",
  ];

  if (
    roles.includes("System Manager") &&
    !is_local &&
    cur_frm.doc.organization_type != "TAG"
  ) {
    for (let f in company_fields) {
      cur_frm.toggle_enable(company_fields[f], 0);
    }
  }

  if (roles.includes("System Manager")) {
    cur_frm.toggle_display(company_fields[0], 1);
  } else {
    if (is_local == 1) {
      cur_frm.toggle_display(company_fields[0], 1);
    } else {
      cur_frm.toggle_enable(company_fields[0], 0);
    }
  }
  if (
    frappe.boot.tag.tag_user_info.user_type == "Hiring User" ||
    frappe.boot.tag.tag_user_info.user_type == "Staffing User"
  ) {
    let company_field = [
      "organization_type",
      "country",
      "industry",
      "default_currency",
      "parent_staffing",
      "name",
      "jazzhr_api_key",
      "make_organization_inactive",
      "company_name",
      "fein",
      "title",
      "primary_language",
      "contact_name",
      "phone_no",
      "email",
      "set_primary_contact_as_account_payable_contact",
      "set_primary_contact_as_account_receivable_contact",
      "accounts_payable_contact_name",
      "accounts_payable_email",
      "accounts_payable_phone_number",
      "accounts_receivable_name",
      "accounts_receivable_rep_email",
      "accounts_receivable_phone_number",
      "cert_of_insurance",
      "w9",
      "safety_manual",
      "industry_type",
      "employees",
      "address",
      "city",
      "state",
      "zip",
      "job_site",
      "drug_screen",
      "drug_screen_rate",
      "background_check",
      "background_check_rate",
      "upload_docs",
      "about_organization",
      "mvr",
      "mvr_rate",
      "shovel",
      "shovel_rate",
      "contract_addendums",
      "rating",
      "average_rating",
      "click_here",
      "job_titles",
    ];
    for (let f in company_field) {
      cur_frm.toggle_enable(company_field[f], 0);
    }
  }
}

/*--------phone and zip validation----------*/
function validate_phone_and_zip(frm) {
  let phone = frm.doc.phone_no || '';
  let zip = frm.doc.zip;
  let is_valid = 1;
  var letters = /^[A-Za-z]+$/
  if (phone && phone.length != 10 && !isNaN(phone) || phone.match(letters)) {
    is_valid = 0;
    frappe.msgprint({
      message: __("Company Phone No. is not valid"),
      title: __("Phone Number"),
      indicator: "red",
    });
  }
  if (zip && zip.length != 5 && !isNaN(zip) || zip.match(letters)) {
    is_valid = 0;
    frappe.msgprint({
      message: __("Enter valid zip"),
      title: __("ZIP"),
      indicator: "red",
    });
  }
  if (is_valid == 0) {
    frappe.validated = false;
  }
}

/*--------jazzhr------------*/
function jazzhr_data(frm) {
  let roles = frappe.user_roles;
  if (roles.includes("Staffing Admin") || roles.includes("Staffing User")) {
    frm
      .add_custom_button("Get data from JazzHR", function () {
        cur_frm.is_dirty() == 1
          ? frappe.msgprint("Please save the form first")
          : make_jazzhr_request(frm);
      })
      .addClass("btn-primary");
  }
}

function make_jazzhr_request(frm) {
  if (frm.doc.jazzhr_api_key) {
    frappe.call({
      method: "tag_workflow.utils.whitelisted.make_jazzhr_request",
      args: { api_key: frm.doc.jazzhr_api_key, company: frm.doc.name },
      freeze: true,
      freeze_message: "<p><b>sending request to JazzHR...</b></p>",
      callback: function (r) {
        if (r && r.message) {
          frappe.msgprint(r.message);
        }
      },
    });
  } else {
    cur_frm.scroll_to_field("jazzhr_api_key");
    frappe.msgprint("<b>JazzHR API Key</b> is required");
  }
}

/*---------make invoice------------*/
function hide_tag_charges(frm) {
  let roles = frappe.user_roles;
  if (roles.includes("System Manager")) {
    prepare_invoice(frm);
  } else {
    cur_frm.toggle_display("tag_charges", 0);
  }
}

function make_invoice(frm) {
  hide_tag_charges(frm);
}

function prepare_invoice(frm) {
  if (["Staffing"].includes(cur_frm.doc.organization_type)) {
    frm
      .add_custom_button(__("Make Invoice"), function () {
        frappe.model.open_mapped_doc({
          method: "tag_workflow.utils.invoice.make_invoice",
          frm: cur_frm,
        });
      })
      .addClass("btn-primary");
  }
}

function hide_connections(frm){
    frm.dashboard.hide();
}

function uploaded_file_format(frm){
	frm.get_field('cert_of_insurance').df.options = {
	    restrictions: {
	    allowed_file_types: ['.pdf','.txt','.docx']
		}
	};
	frm.get_field('w9').df.options = {
	    restrictions: {
	    allowed_file_types: ['.pdf','.txt','.docx']
		}
	};	
  frm.get_field('safety_manual').df.options = {
    restrictions: {
    allowed_file_types: ['.pdf','.txt','.docx']
  }
  };	
  frm.get_field('upload_docs').df.options = {
    restrictions: {
    allowed_file_types: ['.pdf','.txt','.docx']
  }
  };
	
}

function cancel_company(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Company");
	});
}

