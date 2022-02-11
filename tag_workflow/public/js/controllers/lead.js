frappe.ui.form.on("Lead", {
  refresh: function (frm) {
    $('[data-original-title="Menu"]').hide()
    cur_frm.clear_custom_buttons();
    reqd_fields(frm);
    hide_details(frm);
    make_contract(frm);
    let roles = frappe.user_roles;
    if (
      cur_frm.is_dirty() != 1 &&
      frm.doc.status == "Close" &&
      (roles.includes("Tag Admin") ||
        roles.includes("Tag User") ||
        roles.includes("Staffing Admin") ||
        roles.includes("Staffing User"))
    ) {
      onboard_org(frm);
    }
    if(frm.doc.__islocal==1){
			cancel_lead(frm);
		}
  },
  validate: function (frm) {
    let phone = frm.doc.phone_no;
    let email = frm.doc.email_id;
    let zip = frm.doc.zip;
    if (phone && (phone.length != 10 || isNaN(phone))) {
      frappe.msgprint({
        message: __("Not Valid phone number"),
        indicator: "red",
      });
      frappe.validated = false;
    }
    if (
      email &&
      (email.length > 120 || !frappe.utils.validate_type(email, "email"))
    ) {
      frappe.msgprint({ message: __("Not A Valid Email"), indicator: "red" });
      frappe.validated = false;
    }
    if (zip && (zip.length != 5 || isNaN(zip))) {
      frappe.msgprint({ message: __("Not Valid Zip"), indicator: "red" });
      frappe.validated = false;
    }
  },
  setup: function (frm) {
    if(frappe.session.user!='Administrator'){
      setting_owner_company(frm);
    }
  },
  organization_type: function (frm) {
    if (frm.doc.organization_type == "Exclusive Hiring") {
      tag_staff_company(frm);
    } else{
      frm.set_query("owner_company", function (doc) {
        return {
          filters: [["Company", "organization_type", "in", ["TAG"]]],
        };
      });
    }
  },
  owner_company: function (frm) {
      if (frm.doc.owner_company) {
        frm.set_value("owner_company", frm.doc.owner_company);
      }
    else{
      frm.set_value("lead_owner", "");
    }
  },
  lead_owner: function (frm) {
    frm.set_query("lead_owner", function (doc) {
      return {
        query: "tag_workflow.utils.lead.lead_owner",
        filters: {
          owner_company: doc.owner_company,
        },
      };
    });
  },
  before_save: function(frm){
   if (frappe.boot.tag.tag_user_info.company_type=='Staffing') {
    frm.set_value("organization_type", "Exclusive Hiring");} 
  }
});

/*-------reqd------*/
function reqd_fields(frm) {
  let reqd = ["lead_name", "company_name", "email_id"];
  for (let r in reqd) {
    cur_frm.toggle_reqd(reqd[r], 1);
  }

  let roles = frappe.user_roles;
  if (roles.includes("Tag Admin") || roles.includes("Tag User")) {
    cur_frm.toggle_reqd("organization_type", 1);
    frm.set_query("organization_type", function (doc) {
      return {
        filters: [["Organization Type", "name", "!=", "Tag"]],
      };
    });
  } else {
    cur_frm.toggle_display("organization_type", 0);
  }
}

/*------------onboard----------------*/
function onboard_org(frm) {
  var email = frm.doc.email_id;
  var exclusive = frm.doc.company_name;
  var person_name = frm.doc.lead_name;
  var organization_type = frm.doc.organization_type;
  var lead = frm.doc.name
  console.log(lead)

  frappe.db.get_value(
    "User",
    { name: frappe.session.user },
    "company",
    function (r) {
      if (r && r.company) {
        frm
          .add_custom_button("Onboard Organization", function () {
            check_dirty(frm)
              ? onboard_orgs(
                  lead,
                  exclusive,
                  r.company,
                  email,
                  person_name,
                  organization_type
                )
              : console.log("TAG");
          })
          .addClass("btn-primary");
      }
    }
  );
}

function check_dirty(frm) {
  let is_ok = true;
  if (cur_frm.is_dirty() == 1) {
    frappe.msgprint("Please save the form before Onboard Organization");
    is_ok = false;
  }
  return is_ok;
}

/*-------onboard----------*/
function onboard_orgs(
  lead,
  exclusive,
  staffing,
  email,
  person_name,
  organization_type
) {
  if (exclusive && email) {
    frappe.call({
      method: "tag_workflow.controllers.crm_controller.onboard_org",
      freeze: true,
      freeze_message:
        "<p><b>Please wait while we are preparing Organization for onboarding</b></p>",
      args: {
        "lead":lead,
        exclusive: exclusive,
        staffing: staffing,
        email: email,
        person_name: person_name,
        organization_type: organization_type,
      },
      callback: function (r) {
        console.log(r);
      },
    });
  } else {
    !exclusive
      ? cur_frm.scroll_to_field("company_name")
      : cur_frm.scroll_to_field("email_id");
    frappe.msgprint({
      message: __(
        "<b>Organization Name</b> and <b>Email Address</b> is required for Onboarding"
      ),
      title: __("Warning"),
      indicator: "red",
    });
  }
}

/*--------makecontract--------*/
let _contract = `<p><b>Staffing/Vendor Contract</b></p>
<p>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship:</p>

<p>(1) The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</p>
<p>(2) Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</p>
<p>(3) Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</p>
<p>(4) Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws.</p>
<p>(5) Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned.</p>
<p>(6) Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers.</p>
<p>(7) Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract.</p>
<p>(8) Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times.</p>
<p>(9) Billable time begins at the time Workers report to the workplace as designated by the Hiring Company.</p>
<p>(10) Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker.</p>
<p>(11) Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</p>
<p>(12) Staffing Company agrees that it will comply with Hiring Company’s safety program rules.</p>
<p>(13) Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law.</p>
<p>(14) Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties.</p>
<p>(15) Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company.</p>
<p>(16) Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect.</p>
<p>(17) Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract.</p>
<p>(18) Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules.</p>
<p>(19) If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</p>
<p>(20) WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA.</p>
<p>(21) Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same.</p>
<p>(22) Extra Contract Language.</p>`;

function make_contract(frm) {
  if (
    cur_frm.is_dirty() != 1 &&
    frm.doc.status == "Contract Signing" &&
    (roles.includes("Tag Admin") ||
      roles.includes("Tag User") ||
      roles.includes("Staffing Admin") ||
      roles.includes("Staffing User"))
  ) {
    frm
      .add_custom_button("Prepare Contract", function () {
        run_contract(frm);
      })
      .addClass("btn-primary");
  }
}

function run_contract(frm) {
  let contract = frappe.model.get_new_doc("Contract");
  contract.lead = frm.doc.name;
  contract.contract_prepared_by = frappe.session.user;
  contract.party_type = "Customer";
  contract.contract_terms = _contract;
  contract.staffing_company = cur_frm.doc.company;
  contract.hiring_company = "";
  frappe.set_route("form", contract.doctype, contract.name);
}

/*---------hide details----------*/
function hide_details(frm) {
  let fields = [
    "source",
    "designation",
    "campaign_name",
    "gender",
    "mobile_no",
  ];
  for (let data in fields) {
    cur_frm.toggle_display(fields[data], 0);
  }
}

function setting_owner_company(frm) {
  if (frappe.user.has_role("Tag User")) {
    tag_staff_company(frm);
  } 
  else if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
    frm.set_value("organization_type", "Exclusive Hiring")
    frm.set_query("owner_company", function (doc) {
      return {
        filters: [["Company", "organization_type", "in", ["Staffing"]]],
      };
    });
    frappe.call({
      method: "tag_workflow.tag_data.lead_org",
      args: { current_user: frappe.session.user },
      callback: function (r) {
        if (r.message == "success") {
          frm.set_value("owner_company", frappe.boot.tag.tag_user_info.company);
        } else {
          frm.set_value("owner_company", "");
        }
      },
    });
  }
}

function tag_staff_company(frm) {
  frm.set_query("owner_company", function (doc) {
    return {
      filters: [["Company", "organization_type", "in", ["Staffing", "TAG"]]],
    };
  });
}


function cancel_lead(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "User");
	});
}
