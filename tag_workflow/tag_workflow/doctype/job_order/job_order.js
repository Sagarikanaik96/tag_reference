// Copyright (c) 2021, SourceFuse and contributors
// For license information, please see license.txt
frappe.ui.form.on("Job Order", {
  assign_employees: function (frm) {
    if (frm.doc.to_date < frappe.datetime.now_datetime()) {
      frappe.msgprint({
        message: __("Date has been past to claim this order"),
        title: __("Job Order filled"),
        indicator: "blue",
      });
    } else if (
      frm.doc.__islocal != 1 &&
      cur_frm.doc.owner != frappe.session.user &&
      frm.doc.worker_filled < frm.doc.no_of_workers
    ) {
      if (cur_frm.is_dirty()) {
        frappe.msgprint({
          message: __("Please save the form before creating Quotation"),
          title: __("Save Job Order"),
          indicator: "red",
        });
      } else {
        assign_employe(frm);
      }
    } else if (frm.doc.worker_filled >= frm.doc.no_of_workers) {
      frappe.msgprint({
        message: __("No of workers already filled for this job order"),
        title: __("Worker Filled"),
        indicator: "red",
      });
    }
  },
  onload: function (frm) {
    hide_employee_rating(frm);

    if (cur_frm.doc.__islocal == 1) {
      if (
        frappe.boot.tag.tag_user_info.company_type == "Hiring" ||
        frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring"
      ) {
        frm.set_value("company", frappe.boot.tag.tag_user_info.company);
      }
      frm.set_value("from_date", "");
      frm.set_df_property("time_remaining_for_make_edits", "options", " ");
      frappe.call({
        method: "tag_workflow.tag_data.org_industy_type",
        args: {
          company: cur_frm.doc.company,
        },
        callback: function (r) {
          if (r.message.length == 1) {
            cur_frm.set_df_property("category", "read_only", 1);
            cur_frm.set_value("category", r.message[0][0]);
          } else {
            frm.set_query("category", function (doc) {
              return {
                query: "tag_workflow.tag_data.hiring_category",
                filters: {
                  hiring_company: doc.company,
                },
              };
            });
          }
        },
      });
    }
    if (frappe.boot.tag.tag_user_info.company_type != "Staffing") {
      fields_setup(frm);
    }
  },
  setup: function (frm) {
    frm.set_query("job_site", function (doc) {
      return {
        query: "tag_workflow.tag_data.get_org_site",
        filters: {
          job_order_company: doc.company,
        },
      };
    });

    frm.set_query("company", function (doc) {
      return {
        filters: [
          [
            "Company",
            "organization_type",
            "in",
            ["Hiring", "Exclusive Hiring"],
          ],
          ["Company", "make_organization_inactive", "=", 0],
        ],
      };
    });

    frm.set_query("select_job", function (doc) {
      return {
        query:
          "tag_workflow.tag_workflow.doctype.job_order.job_order.get_jobtitle_list",
        filters: {
          job_order_company: doc.company,
        },
      };
    });
    if (
      frappe.boot.tag.tag_user_info.company_type != "Staffing" &&
      cur_frm.doc.__islocal == 1
    ) {
      fields_setup(frm);
    }
  },
  refresh: function (frm) {
    if(frm.doc.__islocal!=1 && frappe.boot.tag.tag_user_info.company_type=="Hiring" && frm.doc.order_status=="Upcoming"){
      hide_unnecessary_data(frm)
    }
    cur_frm.dashboard.hide();
    view_button(frm)
    if (frm.doc.order_status == "Upcoming" && (frappe.user_roles.includes("Staffing Admin") || frappe.user_roles.includes("Staffing User"))){
		frm.add_custom_button(__('Claim Order'), function(){
			if(frm.doc.resumes_required || frm.doc.is_single_share){
				assign_employees(frm)
			}
			else{
				claim_job_order_staffing(frm);
			}
		});
	}	

	if(frappe.boot.tag.tag_user_info.company_type=='Staffing'){
		cur_frm.dashboard.hide();
		show_claim_bar(frm)
		}
    make_invoice(frm);
    if (cur_frm.doc.__islocal == 1) {
      check_company_detail(frm);
      frappe.db.get_doc("Company", cur_frm.doc.company).then((doc) => {
        if (doc.organization_type === "Staffing") {
          cur_frm.set_value("company", "");
        }
      });
      cancel_joborder(frm);
    } else {
      timer_value(frm);
      let roles = frappe.user_roles;
      if (roles.includes("Hiring User") || roles.includes("Hiring Admin")) {
        if (
          frappe.datetime.now_datetime() >= cur_frm.doc.from_date &&
          cur_frm.doc.to_date >= frappe.datetime.now_datetime()
        ) {
          frm.set_df_property("no_of_workers", "read_only", 0);
        }
      }
    }
	
    if (cur_frm.doc.is_single_share == 1 && frappe.boot.tag.tag_user_info.company_type=='Staffing') {
      frm.add_custom_button(__("Deny Job Order"), function () {
        frappe.call({
          method:
            "tag_workflow.tag_workflow.doctype.job_order.job_order.after_denied_joborder",
          args: {
            staff_company: frm.doc.staff_company,
            joborder_name: frm.doc.name,
            job_title: frm.doc.select_job,
            hiring_name: frm.doc.company,
          },
          callback: function (r) {
            cur_frm.refresh();
            cur_frm.reload_doc();
          },
        });
      });
    } else {
      frm.remove_custom_button("Deny Job Order");
    }
  },
  select_job: function (frm) {
    frappe.call({
      method:
        "tag_workflow.tag_workflow.doctype.job_order.job_order.update_joborder_rate_desc",
      args: {
        company: frm.doc.company,
        job: frm.doc.select_job,
      },
      callback: function (r) {
        if (r.message) {
          frm.set_value("description", r.message.description);
          frm.set_value("rate", r.message.rate);
          refresh_field("rate");
          refresh_field("description");
        }
      },
    });
  },
  before_save: function (frm) {
    if (frm.doc.__islocal === 1) {
      if(frm.doc.availability=="Custom"){
        set_custom_days(frm)

      }
      rate_hour_contract_change(frm);
      if (frappe.validated) {
        return new Promise(function (resolve, reject) {
          frappe.confirm(
            "<br><h4>Do you want to save?</h4><br><b>Job Category: </b>" +
              frm.doc.category +
              "<br><b>Job Order Start Date: </b>" +
              frm.doc.from_date +
              "<br><b>Job Order End Date: </b>" +
              frm.doc.to_date +
              "<br><b>Job Order Start Time: </b>" +
              frm.doc.job_start_time +
              "<br><b>Job Title: </b>" +
              frm.doc.select_job +
              "<br><b>Job Duration: </b>" +
              frm.doc.job_order_duration +
              "<br><b>Job Site: </b>" +
              frm.doc.job_site +
              "<br><b>Estimated Per Hour: </b>" +
              frm.doc.estimated_hours_per_day +
              "<br><b>Job Title Description: </b>" +
              frm.doc.description +
              "<br><b>Base Price: </b>" +
              frm.doc.rate +
              "<br><b>Rate Increase: </b>" +
              (frm.doc.per_hour-frm.doc.rate) +
              "<br><b>Total Per Hour Rate: </b>" +
              frm.doc.per_hour +
              "<br><b>Total Flat Rate: </b>" +
              frm.doc.flat_rate +
              "",
            function () {
              let resp = "frappe.validated = false";
              resolve(resp);
              check_company_detail(frm);
            },
            function () {
              reject();
            }
          );
        });
      }
    }
  },
  after_save: function (frm) {
    if (frm.doc.staff_org_claimed) {
      notification_joborder_change(frm);
    } else {
      frappe.call({
        method: "tag_workflow.tag_data.staff_email_notification",
        args: {
          hiring_org: cur_frm.doc.company,
          job_order: cur_frm.doc.name,
          job_order_title: cur_frm.doc.select_job,
          staff_company: cur_frm.doc.staff_company,
        },
      });
    }
  },
  view_contract: function (frm) {
    var contracts =
      "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";
    if (cur_frm.doc.contract_add_on) {
      frappe.db.get_value(
        "Company",
        { name: cur_frm.doc.company },
        ["contract_addendums"],
        function (r) {
          let contract = new frappe.ui.Dialog({
            title: "Contract Details",
            fields: [
              {
                fieldname: "html_37",
                fieldtype: "HTML",
                options:
                  contracts +
                  "<li>" +
                  cur_frm.doc.contract_add_on +
                  "</li>  </ol>  </div>",
              },
            ],
          });
          contract.show();
        }
      );
    } else {
      let contract = new frappe.ui.Dialog({
        title: "Contract Details",
        fields: [
          {
            fieldname: "html_37",
            fieldtype: "HTML",
            options: contracts,
          },
        ],
      });
      contract.show();
    }
  },
  from_date: function (frm) {
    check_from_date(frm);
  },
  to_date(frm) {
    check_to_date(frm);
  },
  estimated_hours_per_day: function (frm) {
    let field = "Estimated Hours Per Day";
    let name = "estimated_hours_per_day";
    let value = frm.doc.estimated_hours_per_day;
    check_value(frm, field, name, value);
  },
  no_of_workers: function (frm) {
    let field = "No Of Workers";
    let name = "no_of_workers";
    let value = frm.doc.no_of_workers;
    check_value(frm, field, name, value);
  },
  rate: function (frm) {
    let field = "Rate";
    let name = "rate";
    let value = parseFloat(frm.doc.rate);
    check_value(frm, field, name, value);
  },
  extra_price_increase: function (frm) {
    let field = "Extra Price Increase";
    let name = "extra_price_increase";
    let value = frm.doc.extra_price_increase;
    check_value(frm, field, name, value);
  },
  per_hour: function (frm) {
    let field = "Per Hour";
    let name = "per_hour";
    let value = frm.doc.per_hour;
    check_value(frm, field, name, value);
  },
  flat_rate: function (frm) {
    let field = "Flat Rate";
    let name = "flat_rate";
    let value = frm.doc.flat_rate;
    check_value(frm, field, name, value);
  },
  availability:function(frm){
    if(frm.doc.availability=="Custom"){
      cur_frm.set_value("select_days","")

    }
  },
  category:function(frm){
    frm.set_value('shovel',"")
  },
  validate: function (frm) {
	  job_order_duration(frm);
    rate_calculation(frm);
    var l = {
      Company: frm.doc.company,
      "Select Job": frm.doc.select_job,
      Category: frm.doc.category,
      "Job Order Start Date": cur_frm.doc.from_date,
      "Job Site": cur_frm.doc.job_site,
      "No Of Workers": cur_frm.doc.no_of_workers,
      Rate: cur_frm.doc.rate,
      "Job Order End Date": cur_frm.doc.to_date,
      "Job Duration": cur_frm.doc.job_order_duration,
      "Estimated Hours Per Day": cur_frm.doc.estimated_hours_per_day,
      "E-Signature Full Name": cur_frm.doc.e_signature_full_name,
    };
    var message = "<b>Please Fill Mandatory Fields:</b>";
    for (let k in l) {
      if (l[k] === undefined || !l[k]) {
        message = message + "<br>" + k;
      }
    }
    if (frm.doc.agree_to_contract == 0) {
      message = message + "<br>Agree To Contract";
    }
    if (frm.doc.no_of_workers < frm.doc.worker_filled) {
      message = "Number of workers cannot be less than worker filled.";
      frappe.db.get_value(
        "Job Order",
        frm.doc.name,
        "no_of_workers",
        function (r) {
          frm.set_value("no_of_workers", r["no_of_workers"]);
        }
      );
    }
    if (message != "<b>Please Fill Mandatory Fields:</b>") {
      frappe.msgprint({
        message: __(message),
        title: __("Error"),
        indicator: "orange",
      });

      frappe.validated = false;
    }
    let email = frm.doc.email;
    if (
      email &&
      (email.length > 120 || !frappe.utils.validate_type(email, "email"))
    ) {
      frappe.msgprint({ message: __("Not A Valid Email"), indicator: "red" });
      frappe.validated = false;
    }
    let phone = frm.doc.phone_number;
    if (phone && (phone.length != 10 || isNaN(phone))) {
      frappe.msgprint({
        message: __("Not Valid phone number"),
        indicator: "red",
      });
      frappe.validated = false;
    }
  },
});

/*-------check company details---------*/
function check_company_detail(frm) {
  let roles = frappe.user_roles;
  if (roles.includes("Hiring User") || roles.includes("Hiring Admin")) {
    var company_name = frappe.boot.tag.tag_user_info.company;
    frappe.call({
      method: "tag_workflow.tag_data.company_details",
      args: { company_name: company_name },
      callback: function (r) {
        if (r.message != "success") {
          msgprint(
            "You can't Create Job Order Unless Your Company Details are Complete"
          );
          frappe.validated = false;
        }
      },
    });
  }
}
/*----------------prepare quote--------------*/
function assign_employe(frm) {
  redirect_quotation(frm);
}

function redirect_quotation(frm) {
  var doc = frappe.model.get_new_doc("Assign Employee");
  var staff_company = staff_company_direct_or_general(frm)
  doc.transaction_date = frappe.datetime.now_date();
  doc.company = staff_company[0];
  doc.job_order = frm.doc.name;
  doc.no_of_employee_required = frm.doc.no_of_workers - frm.doc.worker_filled;
  if(frm.doc.staff_company){
    doc.company=frm.doc.staff_company;
  }
  doc.hiring_organization = frm.doc.company;
  doc.job_category = frm.doc.select_job;
  doc.job_location = frm.doc.job_site;
  doc.job_order_email = frm.doc.owner;
  doc.resume_required = frm.doc.resumes_required;
  doc.is_single_share = frm.doc.is_single_share;
  doc.distance_radius = "5 miles";

  frappe.call({
    method: "tag_workflow.tag_data.staff_org_details",
    args: {
      company_details: frappe.boot.tag.tag_user_info.company,
    },
    callback: function (r) {
      if (r.message == "failed") {
        msgprint(
          "You can't Assign Employees Unless Your Company Details are Complete"
        );
        frappe.validated = false;
      } else {
        frappe.set_route("Form", "Assign Employee", doc.name);
      }
    },
  });
}
function staff_company_direct_or_general(frm){
  if (frm.doc.is_single_share){
      return [frm.doc.staff_company]
  }
  else{
      return frappe.boot.tag.tag_user_info.company || [];
  }
}


function set_read_fields(frm) {
  var myStringArray = [
    "phone_number",
    "estimated_hours_per_day",
    "address",
    "e_signature_full_name",
    "agree_to_contract",
    "age_reqiured",
    "per_hour",
    "flat_rate",
    "email",
    "select_job",
    "rate",
    "description",
  ];
  var arrayLength = myStringArray.length;
  for (var i = 0; i < arrayLength; i++) {
    frm.set_df_property(myStringArray[i], "read_only", 1);
  }
}

function timer_value(frm) {
  var new_date=new Date(String(cur_frm.doc.from_date)+" "+String(cur_frm.doc.job_start_time))
  var time = frappe.datetime.get_hour_diff(
    new_date,
    frappe.datetime.now_datetime()
  );
  if (time < 24) {
    var myStringArray = [
      "company",
      "posting_date_time",
      "from_date",
      "to_date",
      "category",
      "order_status",
      "resumes_required",
      "require_staff_to_wear_face_mask",
      "select_job",
      "job_title",
      "job_site",
      "rate",
      "description",
      "no_of_workers",
      "job_order_duration",
      "extra_price_increase",
      "extra_notes",
      "drug_screen",
      "background_check",
      "driving_record",
      "shovel",
      "phone_number",
      "estimated_hours_per_day",
      "address",
      "e_signature_full_name",
      "agree_to_contract",
      "age_reqiured",
      "per_hour",
      "flat_rate",
      "email",
    ];
    var arrayLength = myStringArray.length;
    for (var i = 0; i < arrayLength; i++) {
      frm.set_df_property(myStringArray[i], "read_only", 1);
    }
    frm.set_df_property("time_remaining_for_make_edits", "options", " ");
  } else {
    set_read_fields(frm);
    time_value(frm);
    setTimeout(function () {
      time_value(frm);
      cur_frm.refresh();
    }, 60000);
  }
}

function time_value(frm) {
  var entry_datetime = frappe.datetime.now_datetime().split(" ")[1];
  var splitEntryDatetime = entry_datetime.split(":");
  var splitExitDatetime = cur_frm.doc.job_start_time.split(":");
  var totalMinsOfEntry =
    splitEntryDatetime[0] * 60 +
    parseInt(splitEntryDatetime[1]) +
    splitEntryDatetime[0] / 60;
  var totalMinsOfExit =
    splitExitDatetime[0] * 60 +
    parseInt(splitExitDatetime[1]) +
    splitExitDatetime[0] / 60;
  var entry_date = new Date(frappe.datetime.now_datetime().split(" ")[0]);
  var exit_date = new Date(cur_frm.doc.from_date.split(" ")[0]);
  var diffTime = Math.abs(exit_date - entry_date);
  var diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  var x = parseInt(diffDays * (24 * 60) + totalMinsOfExit - totalMinsOfEntry);
  let data1 =
    Math.floor(x / 24 / 60) -
    1 +
    " Days:" +
    Math.floor((x / 60) % 24) +
    " Hours:" +
    (x % 60) +
    " Minutes";
  let data = `<p><b>Time Remaining for Make Edits: </b> ${[data1]}</p>`;
  frm.set_df_property("time_remaining_for_make_edits", "options", data);
}

function notification_joborder_change(frm) {
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.job_order.job_order.joborder_notification",
    freeze: true,
    freeze_message: "<p><b>preparing notification for staffing orgs...</b></p>",
    args: {
      organizaton: frm.doc.staff_org_claimed,
      doc_name: frm.doc.name,
      company: frm.doc.company,
      job_title: frm.doc.select_job,
      job_site: frm.doc.job_site,
      posting_date: frm.doc.from_date,
    },
  });
}

function check_from_date(frm) {
  let from_date = frm.doc.from_date || "";
  let to_date = frm.doc.to_date || "";

  if (from_date && from_date <= frappe.datetime.now_date()) {
    frappe.msgprint({
      message: __("<b>Start Date</b> Cannot be Today`s date or Past date"),
      title: __("Error"),
      indicator: "orange",
    });
    cur_frm.set_value("from_date", "");
  } else if (to_date && from_date && from_date >= to_date) {
    frappe.msgprint({
      message: __("<b>End Date</b> Cannot be Less than Start Date"),
      title: __("Error"),
      indicator: "orange",
    });
    cur_frm.set_value("from_date", "");
    cur_frm.set_value("to_date", "");
  }
}
function check_to_date(frm) {
  let from_date = frm.doc.from_date || "";
  let to_date = frm.doc.to_date || "";
  if (to_date && frappe.datetime.now_date() >= to_date) {
    frappe.msgprint({
      message: __("<b>End Date</b> Cannot be Today`s date or Past date"),
      title: __("Error"),
      indicator: "orange",
    });
    cur_frm.set_value("to_date", "");
  } else if (to_date && from_date && from_date >= to_date) {
    frappe.msgprint({
      message: __("<b>End Date</b> Cannot be Less than Start Date"),
      title: __("Error"),
      indicator: "orange",
    });
    cur_frm.set_value("to_date", "");
  }
}

function check_value(frm, field, name, value) {
  if (value && value < 0) {
    frappe.msgprint({
      message: __("<b>" + field + "</b> Cannot be Less Than Zero"),
      title: __("Error"),
      indicator: "orange",
    });
    cur_frm.set_value(name, "");
  }
}

function rate_hour_contract_change(frm) {
  if (cur_frm.doc.no_of_workers < cur_frm.doc.worker_filled) {
    frappe.msgprint({
      message: __("Workers Already Filled"),
      title: __("Error"),
      indicator: "orange",
    });
    frappe.validated = false;
  }
  if (frappe.validated) {
    rate_calculation(frm);
  }
}

function rate_calculation(frm) {
  var extra_price_increase = frm.doc.extra_price_increase || 0;
  var total_per_hour = extra_price_increase + parseFloat(cur_frm.doc.rate);
  var total_flat_rate = 0;
        const optional_field_data = [
          frm.doc.drug_screen,
          frm.doc.background_check,
          frm.doc.driving_record,
          frm.doc.shovel,
        ];
        const optional_fields = [
          "drug_screen",
          "background_check",
          "driving_record",
          "shovel",
        ];
        for (let i = 0; i < optional_fields.length; i++) {
          if (optional_field_data[i] && optional_field_data[i] != "None") {
            let y=optional_field_data[i]

            if(y.includes("Flat")){
              y=y.split("$")
              total_flat_rate =
                total_flat_rate + parseFloat(y[1]);
            }
            else if(y.includes("Hour")){
              y=y.split("$")
              total_per_hour =
                total_per_hour + parseFloat(y[1]);

            }
          } 
          else {
            cur_frm.set_value(optional_fields[i], "None");
          }
        }
        frm.set_value("flat_rate", total_flat_rate);
        frm.set_value("per_hour", total_per_hour);
}

function hide_employee_rating(frm) {
  let table = frm.doc.employee_rating || [];
  if (table.length == 0) {
    cur_frm.toggle_display("employee_rating", 0);
  }
}

/*----------make invoice---------*/
function make_invoice(frm) {
  let roles = frappe.user_roles;
  if (
    cur_frm.doc.__islocal != 1 &&
    roles.includes("Staffing Admin", "Staffing User") &&
    frappe.boot.tag.tag_user_info.company
  ) {
    frappe.db.get_value(
      "Assign Employee",
      {
        company: frappe.boot.tag.tag_user_info.company,
        tag_status: "Approved",
      },
      "name",
      function (r) {
        if (r.name) {
          frm
            .add_custom_button(__("Make Invoice"), function () {
              frappe.model.open_mapped_doc({
                method:
                  "tag_workflow.tag_workflow.doctype.job_order.job_order.make_invoice",
                frm: cur_frm,
              });
            })
            .addClass("btn-primary");
        }
      }
    );
  }
}

function fields_setup(frm) {
  if (cur_frm.doc.company) {
    frappe.db.get_value(
      "Company",
      { name: cur_frm.doc.company },
      ["drug_screen_rate", "hour_per_person_drug", "background_check_rate", "background_check_flat_rate","mvr_rate","mvr_per","shovel_rate","shovel_per_person","contract_addendums"],
      function (r) {
        if (r.contract_addendums != "undefined") {
          cur_frm.set_value("contract_add_on", r.contract_addendums);
        }
        const org_optional_data = [
          r.drug_screen_rate,r.hour_per_person_drug,
          r.background_check_rate,r.background_check_flat_rate,
          r.mvr_rate,r.mvr_per,
          r.shovel_rate,r.shovel_per_person
        ];
        const optional_field_data = [
          "drug_screen",
          "background_check",
          "driving_record",
          "shovel",
        ];
        var a=0
        for (let i = 0; i <=3 ; i++) {         
            cur_frm.set_df_property(
              optional_field_data[i],
              "options",
              "None\n" + "Flat Rate Person:$"+org_optional_data[a]+"\n"+"Hour Per Person:$"+org_optional_data[a+1]
            );
            a=a+2
        }
      }
    );
  }
}

function job_order_duration(frm){
	const to_date = cur_frm.doc.to_date.split(" ")[0].split("-")
	const from_date = cur_frm.doc.from_date.split(" ")[0].split("-")
	let to_date2 = new Date(to_date[1]+'/'+to_date[2]+'/'+to_date[0])
	let from_date2 = new Date(from_date[1]+'/'+from_date[2]+'/'+from_date[0])
	let diff = Math.abs(to_date2 - from_date2)
	let days = diff/(1000 * 3600 * 24) + 1
	if(days == 1){
		cur_frm.set_value('job_order_duration', days+' Day')
	}
	else{
		cur_frm.set_value('job_order_duration', days+' Days')
	}
}

   function claim_job_order_staffing(frm){
	var doc = frappe.model.get_new_doc("Claim Order");
	var staff_company = frappe.boot.tag.tag_user_info.company || [];
	doc.staffing_organization = staff_company[0];
	doc.job_order = frm.doc.name;
	doc.no_of_workers_joborder = frm.doc.no_of_workers
	doc.hiring_organization = frm.doc.company;
	frappe.set_route("Form", "Claim Order", doc.name);
}


function show_claim_bar(frm){
	if (frm.doc.claim && (frm.doc.claim).includes(frappe.boot.tag.tag_user_info.company)){
		cur_frm.toggle_display('section_break_html1', 1);
		frm.remove_custom_button('Claim')
	}
	
}

function assign_employees(frm){
	if(frm.doc.to_date  < frappe.datetime.now_datetime()){
		frappe.msgprint({message:__('Date has been past to claim this order'), title:__('Job Order filled'),indicator: 'blue'})
	}
	else if(frm.doc.__islocal != 1 && cur_frm.doc.owner != frappe.session.user && frm.doc.worker_filled < frm.doc.no_of_workers){
			if(cur_frm.is_dirty()){
					frappe.msgprint({message: __('Please save the form before creating Quotation'), title: __('Save Job Order'), indicator: 'red'});
			}
			else{
					assign_employe(frm);
			}
	}
	else if(frm.doc.worker_filled >= frm.doc.no_of_workers){
			frappe.msgprint({message: __('No of workers already filled for this job order'), title: __('Worker Filled'), indicator: 'red'});
	}

}

function view_button(frm){
  if (frappe.boot.tag.tag_user_info.company_type == "Staffing" && frm.doc.__islocal!=1) {
    cur_frm.dashboard.hide();
     if((frm.doc.staff_org_claimed)){
      view_buttons_staffing(frm);
    }
  }
  else if (frappe.boot.tag.tag_user_info.company_type == "Hiring" || frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring"  && frm.doc.__islocal!=1){
    view_buttons_hiring(frm);

  }
}
function view_buttons_hiring(frm){
  hiring_buttons(frm)

	
	if(cur_frm.doc.__islocal != 1)

	{	
			let datad1 = `<div id="data" style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
			<p><b>Claims </b> ${frm.doc.bid}</p>
			
					</div>`;
      
          $('[data-fieldname = related_details]').click(function(){
            claim_orders(frm)
            
          })
			frm.set_df_property("related_details", "options", datad1);
			frm.toggle_display('related_actions_section',1)
		

		if(frm.doc.claim){
      let datad2 = `<div style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
          <p><b>Messages </b> ${frm.doc.bid}</p>
        </div>`;
        $('[data-fieldname = messages]').click(function() {
          messages(frm)

         
        })
      frm.set_df_property("messages", "options", datad2);
      frm.toggle_display('related_actions_section',1)
		}
	
		if(frm.doc.order_status=='Completed'){
      let datad3 = `<div class="my-2" style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
          <p><b>Timesheets </b>  <button class="btn-primary">View</button></p>
        </div>`;
        $('[data-fieldname = timesheets]').click(function() {
         timesheets_view(frm)
        })
      frm.set_df_property("timesheets", "options", datad3);
      frm.toggle_display('related_actions_section',1)
			frm.add_custom_button(__('Timesheets'), function(){
        timesheets_view(frm)
				

			}, __("View"));
		}
		
	
		if(frm.doc.order_status=='Completed'){
			frappe.call({
				method:"tag_workflow.tag_data.timesheet_detail",
				args: {
						job_order:cur_frm.doc.name,
				},
				callback:function(r){
				if(r.message=='success'){
          let datad4 = `<div class="my-2" style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
								<p><b>Invoices </b> <button class="btn-primary">View</button></p>
							</div>`;
          $('[data-fieldname = invoices]').click(function() {
            sales_invoice_data(frm)
          })
					frm.set_df_property("invoices", "options", datad4);
					frm.toggle_display('related_actions_section',1)
					frm.add_custom_button(__('Invoices'), function(){
            sales_invoice_data(frm)
		
					}, __("View"));
				}
			}
		
			})
			
		}


	}
}


function view_buttons_staffing(frm){

  if((frm.doc.staff_org_claimed).includes(frappe.boot.tag.tag_user_info.company)){
    frm.add_custom_button(__('Assign Employee'), function f1(){
      assign_employe(frm);

    }, __("View"));
    let data1 = `<div style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
    <p><b>Claims </b></p>
    
        </div>`;
        $('[data-fieldname = related_details]').click(function() {
          claim_orders(frm)
        })
    frm.set_df_property("related_details", "options", data1);
    frm.toggle_display('related_actions_section',1)
    staff_assigned_emp(frm)
  }
  else{
    let data2 = `<div style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
    <p><b>Claims </b></p>
    
        </div>`;
        $('[data-fieldname = related_details]').click(function() {
          claim_orders(frm)
        })
    frm.set_df_property("related_details", "options", data2);
    frm.toggle_display('related_actions_section',1)
  
    frm.add_custom_button(__('Claims'), function(){
      claim_orders(frm)

    }, __("View"));

  }
 
  if((frm.doc.claim).includes(frappe.boot.tag.tag_user_info.company)){
    let data3 = `<div style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
						<p><b>Messages </b></p>
					</div>`;
          $('[data-fieldname = messages]').click(function() {
            messages(frm)

          })
			frm.set_df_property("messages", "options", data3);
			frm.toggle_display('related_actions_section',1)
      frm.add_custom_button(__('Messages'), function(){
        messages(frm)
    }, __("View"));
  }
  if( (frm.doc.staff_org_claimed).includes(frappe.boot.tag.tag_user_info.company) && (frm.doc.order_status=='Completed')){
    let data4 = `<div class="my-2"  style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
        <p><b>Timesheets </b>  <button class="btn-primary">View</button></p>
      </div>`;
      $('[data-fieldname = timesheets]').click(function() {
       timesheets_view(frm)
      })
    frm.set_df_property("timesheets", "options", data4);
    frm.toggle_display('related_actions_section',1)
    frm.add_custom_button(__('Timesheets'), function(){
     timesheets_view(frm)
    }, __("View"));
  }
  if( (frm.doc.staff_org_claimed).includes(frappe.boot.tag.tag_user_info.company) && (frm.doc.order_status=='Completed')){
    frappe.call({
      method:"tag_workflow.tag_data.timesheet_detail",
      args: {
          job_order:cur_frm.doc.name,
      },
      callback:function(r){
        if(r.message=='success1')
        {
          let data5 = `<div class="my-2" style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
              <p><b>Invoices </b> <button class="btn-primary">View</button></p>
            </div>`;
            $('[data-fieldname = invoices]').click(function() {
              sales_invoice_data(frm)
            })
            frm.set_df_property("invoices", "options", data5);
            frm.toggle_display('related_actions_section',1)
            frm.add_custom_button(__('Invoices'), function(){
              sales_invoice_data(frm)
              
            }, __("View"));

        }
        
      else if(r.message=='success'){
        let data6 = `<div class="my-2" style="display: flex;flex-direction: column;min-height: 1px;padding: 19px;border-radius: var(--border-radius-md);height: 100%;box-shadow: var(--card-shadow);background-color: var(--card-bg);">
              <p><b>Invoices </b> <button class="btn-primary">View</button></p>
            </div>`;
            $('[data-fieldname = invoices]').click(function() {
              sales_invoice_data(frm)
              
            })
            frm.set_df_property("invoices", "options", data6);
            frm.toggle_display('related_actions_section',1)
            
            frm.add_custom_button(__('Invoices'), function(){
              make_invoice(frm)
            }, __("View"));
      }
    }

    })
  }
}

function hiring_buttons(frm){
  if(cur_frm.doc.__islocal != 1)

	{	
		frm.add_custom_button(__('Claims'), function claim1(){
			claim_orders(frm)
			
		}, __("View"));
    frappe.call({
      method:"tag_workflow.tag_data.assigned_employees",
      args: {
          job_order:cur_frm.doc.name,
      },
      callback:function(r){
        if(r.message=='success1')
        { 
            frm.add_custom_button(__('Approved Employees'), function(){    
                frappe.call({
                  method:"tag_workflow.tag_data.assigned_employee_data",
                  args:{
                      'job_order':cur_frm.doc.name
                  },
                  callback:function(rm){
                      var data = rm.message;
                      let profile_html = `<table><th>Employee Name</th><th>Status</th><th>Staffing Company</th>`;
                      for(let p in data){
                          profile_html += `<tr>
                              <td>${data[p].employee}</td>
                              <td>${data[p].no_show} ${data[p].non_satisfactory} ${data[p].dnr}</td>
                              <td style="margin-right:20px;" >${data[p].staff_company}</td>

                              </tr>`;
                      }
                      profile_html+=`</table><style>th, td {
                        padding-left: 50px;padding-right:50px;
                      } input{width:100%;}
                    </style>`
        
                      var dialog = new frappe.ui.Dialog({
                        title: __('Assigned Employee'),
                        fields: [
                          {fieldname: "staff_companies",fieldtype: "HTML",options:profile_html},

                        ]
                      });
                      dialog.set_primary_action(__('Close'), function() {
                        dialog.hide();

                      });
                      dialog.show();
                      dialog.$wrapper.find('.modal-dialog').css('max-width', '880px');
                      dialog.$wrapper.find('textarea.input-with-feedback.form-control').css("height", "108px");
                  }
                })                                   
            }, __("View"));
        }
      }
    })
  }
	if(frm.doc.claim){

    frm.add_custom_button(__('Messages'), function(){
      messages(frm)
   


    }, __("View"));
  }


}
function timesheets_view(frm){
  frappe.route_options = {
    "job_order_detail": ["=", frm.doc.name]
  };
  frappe.set_route("List", "Timesheet")
}
function claim_orders(frm){
  if(frm.doc.order_status=='Upcoming')
  {
    if(frm.doc.staff_org_claimed){
      frappe.route_options = {
        "job_order": ["=", frm.doc.name],
        "hiring_organization":["=",frm.doc.company],
        "no_of_workers_joborder":["=",frm.doc.no_of_workers]
      };
      frappe.set_route("List", "Claim Order")
  
    }
    else{
      frappe.route_options = {
        "job_order": ["=", frm.doc.name],
        "no_of_workers_joborder":["=",frm.doc.no_of_workers]
  
      };
      frappe.set_route("List", "Claim Order")
  
    } 

  }
  else{
    frappe.route_options = {
      "job_order": ["=", frm.doc.name],
    };
    frappe.set_route("List", "Claim Order")

  }
  
}
function messages(frm){
  $('li.nav-item.dropdown.dropdown-notifications.dropdown-mobile.chat-navbar-icon').click()

}
function sales_invoice_data(frm){
  frappe.route_options = {
    "job_order": ["=", frm.doc.name]
  };
  frappe.set_route("List", "Sales Invoice")
}

function set_custom_days(frm){
  let selected=""
  let data=frm.doc.select_days.length
  for (let i = 0; i < data; i++) {
    if(frm.doc.select_days[i]!="None"){
      selected=selected+frm.doc.select_days[i].days+","
    }

  }
  
  frm.set_value("selected_days",selected)
  frm.set_value("base_price",frm.doc.rate)
  frm.set_value("rate_increase",frm.doc.per_hour-frm.doc.rate)
  
}


function hide_unnecessary_data(frm)
{
  let field_name=['company','order_status','category','select_days','job_order_duration',"rate","worker_filled","extra_price_increase","e_signature_for_order_request_section"]
  var arrayLength = field_name.length;
  for (var i = 0; i < arrayLength; i++) {
    frm.set_df_property(field_name[i], "hidden", 1);
  }
 let display_fields=["base_price","rate_increase"]
  var display_length = display_fields.length;
  for (var j = 0; j < display_length; j++) {
    frm.set_df_property(display_fields[j], "hidden", 0);
  }

}

function staff_assigned_emp(frm){
  frappe.call({
    method:"tag_workflow.tag_data.staff_assigned_employees",
    args: {
        job_order:cur_frm.doc.name,
    },
    callback:function(r){
      if(r.message=='success1')
      {
        frm.add_custom_button(__('Assigned Employees'), function(){
            frappe.call({
              method:"tag_workflow.tag_data.staffing_assigned_employee",
              args:{
                  'job_order':cur_frm.doc.name,
              },
              callback:function(rm){
                  var data = rm.message;
                  let profile_html = `<table><th>Employee Name</th><th>Marked As</th><th>Actions</th>`;
                  for(let p in data){

                      profile_html += `<tr>
                          <td>${data[p].employee}</td>
                          <td>${data[p].no_show} ${data[p].non_satisfactory} ${data[p].dnr}</td>`;                     
                        if(data[parseInt(p)].no_show=="No Show" || data[parseInt(p)].non_satisfactory=="Non Satisfactory"){
                          profile_html+=`<td class="replace" data-fieldname="replace" ><a href="/app/assign-employee/${data[p].assign_name}"><button>Replace</button></a></td>`
                        }
                      profile_html+= `   

                          </tr>`;
                  }
                  profile_html+=`</table><style>th, td {
                    padding-left: 50px;padding-right:50px;
                  } input{width:100%;}
                </style>`
                  var dialog1 = new frappe.ui.Dialog({
                    title: __('Assigned Employee'),
                    fields: [
                      {fieldname: "staff_companies",fieldtype: "HTML",options:profile_html},
                    ]
                  });
                  dialog1.set_primary_action(__('Close'), function() {
                    dialog1.hide();
                  });
                  dialog1.show();
                  dialog1.$wrapper.find('.modal-dialog').css('max-width', '880px');
                  dialog1.$wrapper.find('textarea.input-with-feedback.form-control').css("height", "108px");
              }  
          })
        }, __("View"));
      }
    }
  })
}

function cancel_joborder(frm){
	frm.add_custom_button(__('Cancel'), function(){
		frappe.set_route("Form", "Job Order");
	});
}
