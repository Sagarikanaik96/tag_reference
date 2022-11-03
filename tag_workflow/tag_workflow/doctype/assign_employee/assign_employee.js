// // Copyright (c) 2021, SourceFuse and contributors
// // For license information, please see license.txt
let condition = localStorage.getItem("exclusive_case");
window.conf = 0;
let note = '';
let company_branch = 0;
frappe.ui.form.on("Assign Employee", {
  refresh: function (frm) {
    setTimeout(add_dynamic, 500);
    hide_class_code_rate(frm);
    select_employees(frm);
    setTimeout(function () {
      staffing_company(frm);
    }, 1000);
    $('[class="btn btn-primary btn-sm primary-action"]').show();
    $(".custom-actions.hidden-xs.hidden-md").show();
    window.onclick = function () {
      attachrefresh();
    };
    $(".form-footer").hide();
    if (frm.doc.__islocal == 1) {
      $(".grid-add-row").attr("class", "btn btn-xs btn-secondary grid1-row");
      if (!frm.doc.hiring_organization) {
        frappe.msgprint(
          __("Your Can't Assign Employee without job order detail")
        );
        frappe.validated = false;
        setTimeout(() => {
          frappe.set_route("List", "Job Order");
        }, 5000);
      }
    } else {
      assigned_direct(frm);
    }
    staff_comp(frm);
    render_table(frm);
    approved_employee(frm);
    back_job_order_form(frm);
    document_download();

    $('[data-fieldname="company"]').css("display", "block");

    $(document).on("click", '[data-fieldname="company"]', function () {
      companyhide(5000);
    });

    $('[data-fieldname="company"]').mouseover(function () {
      companyhide(500);
    });

    document.addEventListener("keydown", function () {
      companyhide(500);
    });
    child_table_label();
    render_tab(frm);
    set_payrate_field(frm);
    window.conf = 0;
    add_notes_button(frm);
    check_company_branch(frm);
  },
  e_signature_full_name: function (frm) {
    if (frm.doc.e_signature_full_name) {
      let regex = /[^0-9A-Za-z ]/g;
      if (regex.test(frm.doc.e_signature_full_name) === true) {
        frappe.msgprint(
          __("E-Signature Full Name: Only alphabets and numbers are allowed.")
        );
        frm.set_value("e_signature_full_name", "");
        frappe.validated = false;
      }
    }
  },

  onload_post_render: function (frm) {
    if (cur_frm.doc.resume_required == 1) {
      add_employee_button(frm);
    } else {
      add_employee_row(frm);
    }
    old_unknown_function(frm);
    render_tab(frm);
  },

  onload: function (frm) {
    hide_resume(frm);

    cur_frm.fields_dict["employee_details"].grid.get_field(
      "employee"
    ).get_query = function (doc) {
      let employees = frm.doc.employee_details || [];
      let employees_list = [];
      for (let x in employees) {
        if (employees[x]["employee"]) {
          employees_list.push(employees[x]["employee"]);
        }
      }
      return {
        query:
          "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.get_employee",
        filters: {
          company: doc.hiring_organization,
          emp_company: doc.company,
          all_employees: doc.show_all_employees,
          job_category: doc.job_category,
          distance_radius: doc.distance_radius,
          job_location: doc.job_location,
          employee_lis: employees_list,
          job_order: doc.job_order,
        },
      };
    };
  },

  before_save: function (frm) {
    check_employee_data(frm);
    if (window.conf == 0 && frappe.validated) {
      if (frappe.boot.tag.tag_user_info.company_type == "Staffing") {
        frappe.validated = false;
        confirm_message(frm);
      }
    }
  },
  company: function (frm) {
    cur_frm.clear_table("employee_details");
    cur_frm.refresh_fields();
    if (frm.doc.company && frm.doc.__islocal == 1) {
      set_pay_rate(frm);
      check_class_code(frm)
      check_company_branch(frm);
    }
  },

  after_save: function (frm) {
    localStorage.clear();
    check_job_title(frm);
    frappe.call({
      method:
        "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.payrate_change",
      args: {
        docname: frm.doc.name,
      },
      callback: function (r) {
        if (r.message == "success") {
          if (
            frm.doc.tag_status == "Open" &&
            cur_frm.doc.resume_required == 1
          ) {
            make_hiring_notification(frm);
          } else {
            worker_notification(frm)
            make_notification_approved(frm);
          }
        }
      },
    });
    frm.set_value("previous_worker", frm.doc.employee_details.length);

    frappe.call({
      method: "tag_workflow.tag_data.previous_worker_count",
      args: {
        name: cur_frm.doc.name,
        previous_worker: frm.doc.employee_details.length,
      },
    });
    create_pay_rate(frm);
    update_workers_filled(frm);
    create_staff_comp_code(frm)
  },
  validate: function (frm) {
    let emp_pay_rate = frm.doc.employee_pay_rate;
    let message = "<b>Please Fill Mandatory Fields:</b>";
    if (emp_pay_rate === undefined || !emp_pay_rate || emp_pay_rate == 0) {
      message = message + "<br>Employee Pay Rate";
    }
    message = field_validation(frm, message);
    let is_negative = negative_pay_rate(frm, emp_pay_rate);
    let final_message = "";
    if (message != "<b>Please Fill Mandatory Fields:</b>") {
      final_message += is_negative
        ? message + "<hr>Negative Pay Rate not accepted."
        : message;
    } else if (is_negative) {
      final_message += "Negative Pay Rate not accepted.";
    }

    if (final_message != "") {
      frappe.msgprint({
        message: __(final_message),
        title: __("Error"),
        indicator: "orange",
      });
      frappe.validated = false;
    }
  },

  setup: function (frm) {
    frm.set_query("company", function () {
      return {
        filters: [["Company", "organization_type", "=", "Staffing"]],
      };
    });
  },
  view_contract: function () {
    let contracts =
      "<div class='contract_div'><h3>Staffing/Vendor Contract</h3>This Staffing/Vendor Contract (“Contract”) is entered into by and between Staffing Company and Hiring Company as further described and as set forth below. By agreeing to the Temporary Assistance Guru, Inc. (“TAG”) End-User License Agreement, and using the TAG application service and website (the “Service”) Staffing Company and Hiring Company agree that they have a contractual relationship with each other and that the following terms apply to such relationship: <br> <ol> <li> The billing rate Hiring Company shall pay Staffing Company to hire each temporary worker provided by Staffing Company (the “Worker”) is the rate set forth by the TAG Service for the location and position sought to be filled, and this rate includes all wages, worker’s compensation premiums, unemployment insurance, payroll taxes, and all other employer burdens recruiting, administration, payroll funding, and liability insurance.</li><li> Hiring Company agrees not to directly hire and employ the Worker until the Worker has completed at least 720 work hours. Hiring Company agrees to pay Staffing Company an administrative placement fee of $3,000.00 if Hiring Company directly employs the Worker prior to completion of 720 work hours.</li> <li> Hiring Company acknowledges that it has complete care, custody, and control of workplaces and job sites. Hiring Company agrees to comply with all applicable laws, regulations, and ordinances relating to health and safety, and agrees to provide any site/task specific training and/or safety devices and protective equipment necessary or required by law. Hiring Company will not, without prior written consent of Staffing Company, entrust Staffing Company employees with the handling of cash, checks, credit cards, jewelry, equipment, tools, or other valuables.</li> <li> Hiring Company agrees that it will maintain a written safety program, a hazard communication program, and an accident investigation program. Hiring Company agrees that it will make first aid kits available to Workers, that proper lifting techniques are to be used, that fall protection is to be used, and that Hiring Company completes regular inspections on electrical cords and equipment. Hiring Company represents, warrants, and covenants that it handles and stores hazardous materials properly and in compliance with all applicable laws. </li> <li> Hiring Company agrees to post Occupational Safety and Health Act (“OSHA”) of 1970 information and other safety information, as required by law. Hiring Company agrees to log all accidents in its OSHA 300 logs. Hiring Company agrees to indemnify and hold harmless Staffing Company for all claims, damages, or penalties arising out of violations of the OSHA or any state law with respect to workplaces or equipment owned, leased, or supervised by Hiring Company and to which employees are assigned. </li> <li>  Hiring Company will not, without prior written consent of Staffing Company, utilize Workers to operate machinery, equipment, or vehicles. Hiring Company agrees to indemnify and save Staffing Company and Workers harmless from any and all claims and expenses (including litigation) for bodily injury or property damage or other loss as asserted by Hiring Company, its employees, agents, the owner of any such vehicles and/or equipment or contents thereof, or by members of the general public, or any other third party, arising out of the operation or use of said vehicles and/or equipment by Workers. </li> <li> Commencement of work by dispatched Workers, or Hiring Company’s signature on work ticket serves as confirmation of Hiring Company’s agreement to conditions of service listed in or referred to by this Contract. </li> <li> Hiring Company agrees not to place Workers in a supervisory position except for a Worker designated as a “lead,” and, in that position, Hiring Company agrees to supervise all Workers at all times. </li> <li> Billable time begins at the time Workers report to the workplace as designated by the Hiring Company. </li> <li> Jobs must be canceled a minimum of 24 hours prior to start time to avoid a minimum of four hours billing per Worker. </li> <li> Staffing Company guarantees that its Workers will satisfy Hiring Company, or the first two hours are free of charge. If Hiring Company is not satisfied with the Workers, Hiring Company is to call the designated phone number for the Staffing Company within the first two hours, and Staffing Company will replace them free of charge.</li> <li> Staffing Company agrees that it will comply with Hiring Company’s safety program rules. </li> <li> Overtime will be billed at one and one-half times the regular billing rate for all time worked over forty hours in a pay period and/or eight hours in a day as provided by state law. </li> <li> Invoices are due 30 days from receipt, unless other arrangements have been made and agreed to by each of the parties. </li> <li> Interest Rate: Any outstanding balance due to Staffing Company is subject to an interest rate of two percent (2%) per month, commencing on the 90th day after the date the balance was due, until the balance is paid in full by Hiring Company. </li> <li> Severability. If any provision of this Contract is held to be invalid and unenforceable, then the remainder of this Contract shall nevertheless remain in full force and effect. </li> <li> Attorney’s Fees. Hiring Company agrees to pay reasonable attorney’s fees and/or collection fees for any unpaid account balances or in any action incurred to enforce this Contract. </li> <li> Governing Law. This Contract is governed by the laws of the state of Florida, regardless of its conflicts of laws rules. </li> <li>  If Hiring Company utilizes a Staffing Company employee to work on a prevailing wage job, Hiring Company agrees to notify Staffing Company with the correct prevailing wage rate and correct job classification for duties Staffing Company employees will be performing. Failure to provide this information or providing incorrect information may result in the improper reporting of wages, resulting in fines or penalties being imposed upon Staffing Company. The Hiring Company agrees to reimburse Staffing Company for any and all fines, penalties, wages, lost revenue, administrative and/or supplemental charges incurred by Staffing Company.</li> <li> WORKERS' COMPENSATION COSTS: Staffing Company represents and warrants that it has a strong safety program, and it is Staffing Company’s highest priority to bring its Workers home safely every day. AFFORDABLE CARE ACT (ACA): Staffing Company represents and warrants that it is in compliance with all aspects of the ACA. </li> <li> Representatives. The Hiring Company and the Staffing Company each certifies that its authorized representative has read all of the terms and conditions of this Contract and understands and agrees to the same. </li> ";

    let contract = new frappe.ui.Dialog({
      title: "Contract Details",
      fields: [{ fieldname: "html_37", fieldtype: "HTML", options: contracts }],
    });
    contract.show();
  },
  employee_pay_rate: function (frm) {
    let emp_details = frm.doc.employee_details;
    $.each(emp_details || [], function (_i, v) {
      frappe.model.set_value(
        v.doctype,
        v.name,
        "pay_rate",
        frm.doc.employee_pay_rate
      );
    });
    frm.refresh_field("employee_details");
  },
  staff_class_code:function(frm){
    if(frm.doc.staff_class_code && frm.doc.staff_class_code.length>10){
			frappe.msgprint({
			message: __("Maximum Characters allowed for Class Code are 10."),
			title: __("Error"),
			indicator: "orange",
			});
			frm.set_value("staff_class_code",'');
			frappe.validated = false        
		}
  }
});

/*-----------hiring notification--------------*/
function make_hiring_notification(frm) {
  frappe.db.get_value(
    "Job Order",
    { name: cur_frm.doc.job_order },
    ["owner"],
    function (r_own) {
      frappe.db.get_value(
        "User",
        { name: r_own.owner },
        ["organization_type"],
        function (r) {
          if (r.organization_type != "Staffing" || r == null) {
            frappe.call({
              method: "tag_workflow.tag_data.receive_hiring_notification",
              freeze: true,
              freeze_message:
                "<p><b>preparing notification for Hiring orgs...</b></p>",
              args: {
                user: frappe.session.user,
                company_type: frappe.boot.tag.tag_user_info.company_type,
                hiring_org: cur_frm.doc.hiring_organization,
                job_order: cur_frm.doc.job_order,
                staffing_org: cur_frm.doc.company,
                emp_detail: cur_frm.doc.employee_details,
                doc_name: cur_frm.doc.name,
                employee_filled: cur_frm.doc.employee_details.length,
                no_of_worker_req: frm.doc.no_of_employee_required,
                is_single_share: cur_frm.doc.is_single_share,
                job_title: frm.doc.job_category,
                notification_check: frm.doc.notification_check,
              },
              callback: function (r1) {
                pop_up_message(r1, frm);
              },
            });
          } else {
            let count_len = cur_frm.doc.employee_details.length;
            if (cur_frm.doc.previous_worker) {
              count_len =
                cur_frm.doc.employee_details.length -
                cur_frm.doc.previous_worker;
            }

            frappe.call({
              method: "tag_workflow.tag_data.staff_own_job_order",
              freeze: true,
              freeze_message: "<p><b>preparing notification</b></p>",
              args: {
                job_order: cur_frm.doc.job_order,
                staffing_org: cur_frm.doc.company,
                emp_detail: count_len,
                doc_name: cur_frm.doc.name,
              },
              callback: function () {
                setTimeout(function () {
                  window.location.href = "/app/job-order/" + frm.doc.job_order;
                }, 2000);
              },
            });
          }
        }
      );
    }
  );
}

function check_job_title(frm){
  console.log(frm.doc.select_job)
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.add_job_title",
    args: {
      docname: frm.doc.name,
      // select_job: frm.doc.select_job
    },
  });
}

/*---------employee data--------------*/
function check_employee_data(frm) {
  let msg = [];
  let table = frm.doc.employee_details || [];
  let employees = [];
  let assigned = 0;

  if (frm.doc.resume_required == 1) {
    resume_data(msg, table);
  }
  if (frm.doc.resume_required != 1 || condition == 1) {
    table_emp(frm, table, msg);
  }
  company_check(frm, table, msg);

  for (let e in table) {
    !employees.includes(table[e].employee)
      ? employees.push(table[e].employee)
      : msg.push(
          "Employee <b>" +
            table[e].employee +
            " </b>appears multiple time in Employee Details"
        );
    assigned += table[e].approved == 1 ? 1 : 0;
  }
  if (
    assigned == 0 &&
    frm.doc.__islocal != 1 &&
    !["Staffing", "TAG"].includes(frappe.boot.tag.tag_user_info.company_type)
  ) {
    msg.push("Please select an employee to assign.");
  }
  if (msg.length) {
    frappe.msgprint({
      message: msg.join("<br>"),
      title: __("Warning"),
      indicator: "red",
    });
    frappe.validated = false;
  }
}

/*--------------child table------------------*/
function render_table(frm) {
  if (frm.doc.tag_status == "Approved") {
    frappe.call({
      method: "tag_workflow.utils.timesheet.check_employee_editable",
      args: {
        job_order: frm.doc.job_order,
        name: frm.doc.name,
        creation: frm.doc.creation,
      },
      callback: function (r) {
        if (r && r.message == 0) {
          cur_frm.fields_dict["employee_details"].refresh();
        } else {
          cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = false;
          cur_frm.fields_dict["employee_details"].refresh();
          cur_frm.toggle_display("replaced_employees", 1);
        }
      },
    });
  }
}

function render_tab(frm) {
  let items = frm.doc.employee_details || [];
  let emps = 0;
  let is_open = 0;
  for (let i in items) {
    if (frm.doc.resume_required == 1 && items[i].approved) {
      emps += 1;
    }
  }

  if (
    (frm.doc.resume_required == 1 && emps < frm.doc.no_of_employee_required) ||
    (frm.doc.resume_required == 0 &&
      items.length < frm.doc.no_of_employee_required)
  ) {
    is_open = 1;
  }

  if (is_open == 1) {
    frm.set_df_property("employee_details", "read_only", 0);
    cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = false;
    cur_frm.fields_dict["employee_details"].refresh();
    cur_frm.refresh_field("employee_details");
  }
}

/*-------------------------------*/

frappe.ui.form.on("Assign Employee Details", {
  before_employee_details_remove: function (frm, cdt, cdn) {
    let child = frappe.get_doc(cdt, cdn);
    if (frm.doc.tag_status == "Approved" && child.__islocal != 1) {
      frappe.throw("You can't delete employee details once it's Approved.");
    }
  },
  employee: function (frm, cdt, cdn) {
    let child = locals[cdt][cdn];
    
    if (child.employee) {
      check_mandatory_field(child.employee,child.employee_name)
      frappe.call({
        method: "tag_workflow.tag_data.joborder_resume",
        args: { name: child.employee },
        callback: function (r) {
          if (r.message[0]["resume"]) {
            frappe.model.set_value(cdt, cdn, "resume", r.message[0]["resume"]);
          } else {
            frappe.model.set_value(cdt, cdn, "resume", "");
          }
          cur_frm.refresh_field("employee_details");
        },
      });

      if (frm.doc.show_all_employees == 0) {
        frappe.db.get_value(
          "Employee",
          { name: child.employee },
          ["job_category"],
          function (r) {
            if (r.job_category && r.job_category != "null") {
              frappe.model.set_value(
                cdt,
                cdn,
                "job_category",
                frm.doc.job_category
              );
            }
          }
        );
      }

      if (child.__islocal != 1) {
        check_old_value(child);
      }
      branch_wallet(frm.doc.company, child.employee, child.employee_name, cdt, cdn);
    }
  },
  employee_details_add: function (frm, cdt, cdn) {
    if (frm.doc.employee_pay_rate) {
      frappe.model.set_value(cdt, cdn, "pay_rate", frm.doc.employee_pay_rate);
    }
  },
});

function approved_employee(frm) {
  if (
    cur_frm.doc.tag_status == "Approved" &&
    (frappe.boot.tag.tag_user_info.company_type == "Hiring" ||
      frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring") &&
    frm.doc.resume_required == 1 &&
    frm.doc.approve_employee_notification === 1
  ) {
    let current_date = new Date(frappe.datetime.now_datetime());
    let approved_date = new Date(frm.doc.modified);
    let diff = current_date.getTime() - approved_date.getTime();
    let emp_selected = 0;
    for (let i in frm.doc.employee_details) {
      emp_selected += cur_frm.doc.employee_details[i]["approved"];
    }
    diff = parseInt(diff / 1000);
    if (diff < 60) {
      frappe.call({
        method: "tag_workflow.tag_data.update_job_order",
        freeze: true,
        freeze_message:
          "<p><b>preparing notification for Staffing orgs...</b></p>",
        args: {
          user: frappe.session.user,
          company_type: frappe.boot.tag.tag_user_info.company_type,
          sid: frappe.boot.tag.tag_user_info.sid,
          job_name: cur_frm.doc.job_order,
          employee_filled: emp_selected,
          staffing_org: cur_frm.doc.company,
          hiringorg: cur_frm.doc.hiring_organization,
          name: frm.doc.name,
        },
        callback: function (r) {
          pop_up_message(r, frm);
        },
      });
    }

    // cur_frm.set_value('approve_employee_notification',0)
    cur_frm.refresh_field("approve_employee_notification");
  }
}

function hide_resume(frm) {
  let refresh = 0;
  if (
    frm.doc.resume_required &&
    frappe.boot.tag.tag_user_info.company_type == "Staffing" &&
    frm.doc.tag_status != "Approved"
  ) {
    let table = frappe.meta.get_docfield(
      "Assign Employee Details",
      "approved",
      frm.doc.name
    );
    table.hidden = 1;
    refresh = 1;
  }

  if (!frm.doc.resume_required) {
    let resume = frappe.meta.get_docfield(
      "Assign Employee Details",
      "resume",
      frm.doc.name
    );
    resume.hidden = 1;
    let approved = frappe.meta.get_docfield(
      "Assign Employee Details",
      "approved",
      frm.doc.name
    );
    approved.hidden = 1;
    refresh = 1;
    if (frm.doc.job_order) {
      frappe.call({
        method: "tag_workflow.tag_data.check_status_job_order",
        args: {
          job_name: cur_frm.doc.job_order,
        },
        async: 0,
        callback: function (r) {
          if (r.message == "Completed") {
            frm.set_df_property("employee_details", "read_only", 1);
            frm.set_df_property("distance_radius", "read_only", 1);
            frm.set_df_property("show_all_employees", "read_only", 1);
          }
        },
      });
    }
  }
  if (
    ["Hiring", "Exclusive Hiring"].includes(
      frappe.boot.tag.tag_user_info.company_type
    )
  ) {
    let rate_field = frappe.meta.get_docfield(
      "Assign Employee Details",
      "pay_rate",
      frm.doc.name
    );
    rate_field.hidden = 1;
    refresh = 1;
  }
  if (refresh == 1) {
    frm.refresh_fields();
  }
}

function back_job_order_form(frm) {
  frm.add_custom_button(
    __("Job Order"),
    function () {
      frappe.set_route("Form", "Job Order", frm.doc.job_order);
    },
    __("View")
  );
}

function staff_comp(frm) {
  if (frm.doc.__islocal == 1 && frm.doc.is_single_share == 1) {
    frm.set_df_property("company", "read_only", 1);
  }
}

function worker_notification(frm) {
  if (
    frm.doc.tag_status == "Open" &&
    frappe.boot.tag.tag_user_info.company_type == "Staffing" &&
    frm.doc.__islocal != 1
  ) {
    frappe.call({
      method:
        "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.worker_data",
      args: {
        job_order: frm.doc.job_order,
      },
      callback: function (r) {
        let worker_required =
          r.message[0].no_of_workers - r.message[0].worker_filled;
        if (
          worker_required < frm.doc.employee_details.length &&
          (frm.doc.resume_required != 1 ||
            condition == 1 ||
            frappe.boot.tag.tag_user_info.company_type == "Hiring")
        ) {
          frappe.msgprint(
            "No Of Workers required for " +
              frm.doc.job_order +
              " is " +
              worker_required
          );
          cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = false;
          frm.set_df_property("employee_details", "read_only", 0);
          cur_frm.fields_dict["employee_details"].refresh();
        }
      },
    });
  } else if (
    frappe.boot.tag.tag_user_info.company_type == "Staffing" &&
    frm.doc.resume_required == 0 &&
    frm.doc.job_order
  ) {
    frappe.call({
      method:
        "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.approved_workers",
      args: {
        job_order: frm.doc.job_order,
        user_email: frappe.session.user_email,
      },
      async: 0,
      callback: function (r) {
        if (r.message.length != 0) {
          update_value(frm,r);

        }
      },
    });
  }
}

function table_emp(frm, table, msg) {
  if (frm.doc.tag_status == "Approved" && frm.doc.resume_required == 0) {
    table.length > Number(frm.doc.claims_approved)
      ? msg.push(
          "Employee Details(<b>" +
            table.length +
            "</b>) value is more than No. Of Employees Approved(<b>" +
            frm.doc.claims_approved +
            "</b>) for the Job Order(<b>" +
            frm.doc.job_order +
            "</b>)"
        )
      : console.log("TAG");
  } else if (frm.doc.resume_required == 0) {
    table.length > Number(frm.doc.claims_approved)
      ? msg.push("Please Assign " + frm.doc.claims_approved + " Employee(s)")
      : console.log("TAG");
  } else {
    table.length > Number(frm.doc.no_of_employee_required)
      ? msg.push(
          "Employee Details(<b>" +
            table.length +
            "</b>) value is more than No. Of Employees Required(<b>" +
            frm.doc.no_of_employee_required +
            "</b>) for the Job Order(<b>" +
            frm.doc.job_order +
            "</b>)"
        )
      : console.log("TAG");
  }
}

function make_notification_approved(frm) {
  let count = cur_frm.doc.employee_details.length;
  if (cur_frm.doc.previous_worker) {
    count = cur_frm.doc.employee_details.length - cur_frm.doc.previous_worker;
  }

  frappe.call({
    method: "tag_workflow.tag_data.receive_hire_notification",
    freeze: true,
    freeze_message: "<p><b>preparing notification for Hiring orgs...</b></p>",
    args: {
      user: frappe.session.user,
      company_type: frappe.boot.tag.tag_user_info.company_type,
      hiring_org: cur_frm.doc.hiring_organization,
      job_order: cur_frm.doc.job_order,
      staffing_org: cur_frm.doc.company,
      emp_detail: cur_frm.doc.employee_details,
      doc_name: cur_frm.doc.name,
      no_of_worker_req: frm.doc.no_of_employee_required,
      is_single_share: cur_frm.doc.is_single_share,
      job_title: frm.doc.job_category,
      worker_fill: count,
    },
    callback: function (r) {
      pop_up_message(r, frm);
    },
  });
}

function resume_data(msg, table) {
  for (let r in table) {
    if (
      table[r].resume === null ||
      table[r].resume == undefined ||
      table[r].resume == ""
    ) {
      let message = "Attach the Resume to Assign the Employee.";
      if (!msg.includes(message)) {
        msg.push(message);
      }
      frappe.validated = false;
    }
  }
}
function document_download() {
  $('[data-fieldname="resume"]').on("click", (e) => {
    let file = e.target.innerText;
    let link = "";
    if (file.includes(".")) {
      if (file.length > 1) {
        if (file.includes("/files/")) {
          link = window.location.origin + file;
        } else {
          link = window.location.origin + "/files/" + file;
        }
        let data = file.split("/");
        const anchor = document.createElement("a");
        anchor.href = link;
        anchor.download = data[data.length - 1];
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
      }
    }
  });
}

function attachrefresh() {
  setTimeout(() => {
    document
      .querySelectorAll('div[data-fieldname="resume"]')
      .forEach(function (oInput) {
        try {
          oInput.children[1].innerText = oInput.children[1].innerText
            .split("/")
            .slice(-1)[0];
        } catch (error) {
          console.log(error);
        }
      });
  }, 200);
}

function company_check(frm, table, msg) {
  for (let d in table) {
    if (
      table[d].company != null &&
      table[d].company != frm.doc.company &&
      table[d].company
    ) {
      msg.push(
        "Employee <b>" +
          table[d].employee +
          " </b>does not belong to " +
          frm.doc.company
      );
    }
  }
}

function companyhide(time) {
  setTimeout(() => {
    let txt = $('input[data-fieldname="company"]')[1].getAttribute("aria-owns");
    let txt2 = 'ul[id="' + txt + '"]';
    let arry = document.querySelectorAll(txt2)[0].children;
    document.querySelectorAll(txt2)[0].children[arry.length - 2].style.display =
      "none";
    document.querySelectorAll(txt2)[0].children[arry.length - 1].style.display =
      "none";
  }, time);
}

function child_table_label() {
  let child_table = [
    "employee",
    "employee_name",
    "resume",
    "employee_status",
    "employee_replaced_by",
  ];
  for (let i in child_table) {
    $("[data-fieldname=" + child_table[i] + "]").on("mouseover", function (e) {
      let file = e.target.innerText;
      $(this).attr("title", file);
    });
  }
}

function add_employee_row(frm) {
  if (frm.doc.claims_approved) {
    if (frm.doc.claims_approved > frm.doc.employee_details.length) {
      cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = false;
      cur_frm.fields_dict["employee_details"].refresh();
    } else {
      cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = true;
      cur_frm.fields_dict["employee_details"].refresh();
    }
  } else {
    if (frm.doc.claims_approved > frm.doc.employee_details.length) {
      console.log(
        frm.doc.no_of_employee_required >= frm.doc.employee_details.length
      );
      cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = false;
      cur_frm.fields_dict["employee_details"].refresh();
    } else {
      cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = true;
      cur_frm.fields_dict["employee_details"].refresh();
    }
  }
}

function staffing_company(frm) {
  if (frm.doc.__islocal == 1) {
    if (frappe.boot.tag.tag_user_info.company_type == "Staffing") {
      frappe.call({
        method: "tag_workflow.tag_data.lead_org",
        args: { current_user: frappe.session.user },
        callback: function (r) {
          if (r.message == "success") {
            frm.set_value("company", frappe.boot.tag.tag_user_info.company);
            frm.refresh_fields();
          } else {
            frm.refresh_fields();
          }
        },
      });
    }
  }
}

/*-------------------------------------*/
function check_old_value(child) {
  if (child.employee) {
    frappe.call({
      method:
        "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.check_old_value",
      args: { name: child.name },
      callback: function (r) {
        let emp = r.message;
        if (emp != child.employee) {
          update_replaced_emp(emp);
        }
      },
    });
  }
}

function update_replaced_emp(emp) {
  let items = cur_frm.doc.items || [];
  let is_emp = 1;
  for (let i in items) {
    if (items[i].employee == emp) {
      is_emp = 0;
    }
  }

  if (is_emp) {
    let child = frappe.model.get_new_doc(
      "Replaced Employee",
      cur_frm.doc,
      "items"
    );
    $.extend(child, { employee: emp });
    cur_frm.refresh_field("items");
  }
}

function old_unknown_function(frm) {
  if (cur_frm.doc.employee_details.length > 0) {
    $('*[data-fieldname="employee_details"]')
      .find(".grid-add-row")[0]
      .addEventListener("click", function () {
        attachrefresh();
      });

    $("[data-fieldname=employee_details]").mouseover(function () {
      attachrefresh();
    });

    attachrefresh();
    employee_resume_fun(frm);
  }
}

function employee_resume_fun(frm) {
  $(document).on("click", '[data-fieldname="employee"]', function () {
    if ($('[data-fieldname="employee"]').last().val() != "") {
      frappe.call({
        method: "tag_workflow.tag_data.joborder_resume",
        args: { name: $('[data-fieldname="employee"]').last().val() },
        callback: function (r) {
          if ($('[data-fieldname="resume"]').last().text() == "Attach") {
            frm.doc.employee_details.forEach((element) => {
              if (
                element.employee ===
                $('[data-fieldname="employee"]').last().val()
              ) {
                element.resume = r.message[0]["resume"];
              }
            });
            cur_frm.refresh_field("employee_details");
          }
        },
      });
    }
  });
}

function add_dynamic() {
  if (cur_frm.doc.company && cur_frm.doc.__islocal != 1) {
    Array.from($('[data-doctype="Company"]')).forEach((_field) => {
      localStorage.setItem("company", cur_frm.doc.company);
      _field.href = "/app/dynamic_page";
    });
  }
}

function select_employees(frm) {
  if (
    (frappe.boot.tag.tag_user_info.company_type == "Hiring" ||
      frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring") &&
    frm.doc.tag_status == "Open"
  ) {
    frm.add_custom_button(__("Select Employees"), function () {
      pop_up();
    });
  }
}

function pop_up() {
  note='';
  let head = `<div class="table-responsive employee_popup"><table class="col-md-12 my-2 basic-table table-headers table table-hover"><thead><tr><th><input type="checkbox" class="grid-row-check pull-left" onclick="select_all1()" id="all"></th><th>Employee ID</th><th>Employee Name</th><th>Resume</th><th></th></tr></thead><tbody>`;
  let html = ``;

  for (let d in cur_frm.doc.employee_details) {
    let resume = cur_frm.doc.employee_details[d].resume.split("/");
    let resume1 = resume[resume.length - 1];
    html += `<tr><td><input type="checkbox" id="${cur_frm.doc.employee_details[d].employee}" </td>
		<td>${cur_frm.doc.employee_details[d].employee}</td>
		<td>${cur_frm.doc.employee_details[d].employee_name}</td><td>${resume1}</td>
		</tr>`;
  }
  let body;
  if (html) {
    body = head + html + "</tbody></table>";
  } else {
    body =
      head +
      `<tr><td></td><td></td><td>No Data Found</td><td></td><td></td><td></td></tbody></table> </div>`;
  }
  let assign_emp_id = cur_frm.doc.name;

  let notes_field = `<div class="px-3"><p class="mb-1"><label for="w3review">Notes:</label></p><textarea class="w-100" rows="3" label="Notes" id="_${assign_emp_id}_notes" class="head_count_tittle" maxlength="160" onblur=update_notes($(this).val())></textarea><small>Character limit: 160</small> </div>`;
  body = body + notes_field;
  let fields = [{ fieldname: "", fieldtype: "HTML", options: body }];
  let dialog = new frappe.ui.Dialog({
    title: "Select Employees",
    fields: fields,
  });
  dialog.show();
  dialog.$wrapper.find(".modal-dialog").css("max-width", "575px");
  dialog.set_primary_action(__("Submit"), function () {
    update_table(dialog);
  });
}

window.select_all1 = function () {
  let all_len = $('[id="all"]').length;
  let all = $('[id="all"]')[all_len - 1].checked;
  for (let d in cur_frm.doc.employee_details) {
    let id1 = cur_frm.doc.employee_details[d].employee;
    let l = $("[id=" + id1 + "]").length;
    if (all) {
      $("[id=" + id1 + "]")[l - 1].checked = true;
    } else {
      $("[id=" + id1 + "]")[l - 1].checked = false;
    }
  }
};

window.update_notes=(notes)=>{
  note = notes;
}

function update_table(dialog) {
  let data = [];
  for (let d in cur_frm.doc.employee_details) {
    let id1 = cur_frm.doc.employee_details[d].employee;
    let l = $("[id=" + id1 + "]").length;
    if ($("[id=" + id1 + "]")[l - 1].checked) {
      data.push(id1);
    }
  }
  frappe.call({
    method: "tag_workflow.tag_data.approved_employee",
    args: {
      id: data,
      name: cur_frm.doc.name,
      job_order: cur_frm.doc.job_order,
      assign_note: note,
    },
    callback: function (r) {
      if (r.message == "error") {
        frappe.msgprint(
          "No. of selected employees is greater than no. of employees required"
        );
        setTimeout(cur_frm.reload_doc(), 2000);
      }
      cur_frm.refresh_field("employee_details");
      cur_frm.reload_doc();
      cur_frm.reload_doc();
    },
  });
  dialog.hide();
}

function pop_up_message(r, frm) {
  if (r.message == 1) {
    frappe.msgprint("Email Sent Successfully");
    setTimeout(function () {
      window.location.href = "/app/job-order/" + frm.doc.job_order;
    }, 3000);
  }
}
function confirm_message(frm) {
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.check_emp_available",
    args: {
      frm: frm.doc,
    },
    async: 1,
    callback: function (r) {
      if (r.message[0].length == 0 || r.message[0] == 1) {
        check_pay_rate(frm, r.message[1]);
      } else {
        return new Promise(function (resolve) {
          let pop_up1;
          let msg1 = "";
          for (let i = 0; i <= r.message[0].length - 1; i++) {
            let new_msg =
              "Warning: " +
              r.message[0][i]["employee"] +
              " is scheduled for " +
              r.message[0][i]["job_order"] +
              " within this Job Order’s timeframe.";
            msg1 = msg1 + "<br>" + new_msg;
          }
          let pay_msg = pay_rate_message(frm, r.message[1]);
          pop_up1 = pay_msg == "" ? msg1 : msg1 + "<hr>" + pay_msg;
          let confirm_assign = new frappe.ui.Dialog({
            title: __("Warning"),
            fields: [
              {
                fieldname: "save_joborder",
                fieldtype: "HTML",
                options: pop_up1,
              },
            ],
          });
          confirm_assign.no_cancel();
          confirm_assign.set_primary_action(__("Confirm"), function () {
            let resp = "frappe.validated = false";
            window.conf = 1;
            frm.save();
            resolve(resp);
            confirm_assign.hide();
          });
          confirm_assign.set_secondary_action_label(__("Cancel"));
          confirm_assign.set_secondary_action(() => {
            confirm_assign.hide();
          });
          confirm_assign.show();
          confirm_assign.$wrapper.find(".modal-dialog").css("width", "450px");
        });
      }
    },
  });
}

function add_employee_button(frm) {
  if (frm.doc.tag_status == "Open") {
    cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = false;
    cur_frm.fields_dict["employee_details"].refresh();
  } else {
    cur_frm.fields_dict["employee_details"].grid.cannot_add_rows = true;
    cur_frm.fields_dict["employee_details"].refresh();
  }
}

function assigned_direct(frm) {
  if (
    cur_frm.doc.claims_approved &&
    cur_frm.doc.claims_approved > cur_frm.doc.employee_details.length
  ) {
    frm.set_df_property("employee_details", "read_only", 0);
  } else {
    frappe.db.get_value(
      "Job Order",
      { name: frm.doc.job_order },
      ["order_status"],
      (r) => {
        if (
          r.order_status != "Completed" &&
          ["Staffing Admin", "TAG Admin", "Administrator"].includes(
            frappe.boot.tag.tag_user_info.user_type
          )
        ) {
          let table_fields = [
            "employee_name",
            "job_category",
            "company",
            "approved",
          ];
          for (let i in table_fields) {
            frm.fields_dict.employee_details.grid.update_docfield_property(
              table_fields[i],
              "read_only",
              1
            );
            cur_frm.refresh_fields();
          }
        } else {
          frm.set_df_property("employee_details", "read_only", 1);
        }
      }
    );
  }
}

function set_payrate_field(frm) {
  frm.set_df_property(
    "employee_pay_rate",
    "label",
    'Employee Pay Rate <span style="color: red;">&#42;</span>'
  );
  frappe.db.get_value(
    "Job Order",
    { name: frm.doc.job_order },
    ["order_status"],
    (r) => {
      if (r.order_status == "Completed") {
        frm.set_df_property("employee_pay_rate", "read_only", 1);
        frm.set_df_property('staff_class_code', 'read_only', 1);
				frm.set_df_property('staff_class_code_rate', 'read_only', 1);
      } else if (
        !["Hiring", "Exclusive Hiring"].includes(
          frappe.boot.tag.tag_user_info.company_type
        )
      ) {
        $('[data-fieldname = "employee_pay_rate"]').attr("id", "emp_pay_rate");

      }
    }
  );
}

function set_pay_rate(frm) {
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.claim_order.claim_order.set_pay_rate",
    args: {
      hiring_company: frm.doc.hiring_organization,
      job_title: frm.doc.job_category,
      job_site: frm.doc.job_location,
      staffing_company: frm.doc.company,
    },
    callback: function (res) {
      let rate = res && res.message ? res.message.toFixed(2) : undefined;
      frm.set_value("employee_pay_rate", rate);
    },
  });
}

function check_pay_rate(frm, pay_rate_details) {
  let msg = pay_rate_message(frm, pay_rate_details);
  return new Promise(function (resolve) {
    if (msg != "") {
      frappe.validated = false;
      let resp;
      let dialog = new frappe.ui.Dialog({
        title: __("Warning!"),
        fields: [
          { fieldname: "check_pay_rate", fieldtype: "HTML", options: msg },
        ],
      });
      dialog.no_cancel();
      dialog.set_primary_action(__("Yes"), function () {
        resp = "frappe.validated = false";
        window.conf = 1;
        frm.save();
        resolve(resp);
        dialog.hide();
      });
      dialog.set_secondary_action_label(__("No"));
      dialog.set_secondary_action(function () {
        dialog.hide();
      });
      dialog.show();
    } else {
      window.conf = 1;
      frm.save();
    }
  });
}

function create_pay_rate(frm) {
  frappe.call({
    method:
      "tag_workflow.tag_workflow.doctype.claim_order.claim_order.create_pay_rate",
    args: {
      hiring_company: frm.doc.hiring_organization,
      job_title: frm.doc.job_category,
      job_site: frm.doc.job_location,
      employee_pay_rate: frm.doc.employee_pay_rate,
      staffing_company: frm.doc.company,
    },
  });
}

function field_validation(frm, message) {
  let emp_tab = frm.doc.employee_details;

  if (emp_tab === undefined || emp_tab.length == 0) {
    message = message + "<br>Employee Details";
  } else {
    for (let i in emp_tab) {
      if (!emp_tab[i].employee && !message.includes("<br>Employee Details")) {
        message = message + "<br>Employee Details";
      }
      if (
        !emp_tab[i].pay_rate ||
        (emp_tab[i].pay_rate == 0 && !message.includes("<br>Pay Rate"))
      ) {
        message = message + "<br>Pay Rate";
      }
    }
  }

  return message + field_validation_contd(frm);
}

function field_validation_contd(frm) {
  let message = "";
  let sign = cur_frm.doc.e_signature_full_name;
  if (frm.doc.resume_required == 1) {
    if (sign === undefined || !sign) {
      message = message + "<br>E Signature Full Name";
    }
    if (frm.doc.agree_contract == 0 || frm.doc.agree_contract === undefined) {
      message = message + "<br>Agree To Contract";
    }
  }
  return message;
}

function negative_pay_rate(frm, emp_pay_rate) {
  let emp_tab = frm.doc.employee_details;
  let is_negative = false;
  for (let i in emp_tab) {
    if (emp_tab[i].pay_rate < 0) {
      is_negative = true;
    }
  }
  return emp_pay_rate < 0 || is_negative ? true : false;
}

function pay_rate_message(frm, pay_rate_details) {
  let msg = "";
  if (Object.keys(pay_rate_details).includes("emp_pay_rate")) {
    msg +=
      "Employee Pay Rate of $" +
      pay_rate_details.emp_pay_rate +
      " is greater than the bill rate of $" +
      pay_rate_details.bill_rate +
      " for " +
      frm.doc.job_order +
      ". Please confirm.";
  }
  if (Object.keys(pay_rate_details).includes("employees")) {
    msg += msg != "" ? "<hr>" : "";
    msg +=
      "Pay Rate is greater than the bill rate of $" +
      pay_rate_details.bill_rate +
      " for " +
      frm.doc.job_order +
      " for the below employees. Please confirm.";
    msg +=
      "<br><table style='width:50%'><tr><td><b>Employee Name</b></td><td><b>Pay Rate</b></td></tr>";
    let keys = Object.keys(pay_rate_details.employees);
    keys.forEach((key) => {
      msg +=
        "<tr><td>" +
        key +
        "</td><td>$" +
        pay_rate_details.employees[key] +
        "</td></tr>";
    });
    msg += "</table>";
  }
  return msg;
}

function update_value(frm,r){
  frm.set_value("claims_approved", r.message[0].approved_no_of_workers);
  frm.set_value("company", r.message[0].staffing_organization);
  frm.set_value('notes',r.message[0].notes);

  frm.set_query("company", function () {
    return {
      filters: [
        ["Company", "name", "=", r.message[0].staffing_organization],
      ],
    };
  });
  frm.set_df_property("claims_approved", "hidden", 0);
  
}
function update_workers_filled(frm){
  if(frm.doc.__islocal!=1){
    frappe.call({
      method:'tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.update_workers_filled',
      args:
      {
        job_order_name:frm.doc.job_order
      }
    })
  }
}
function create_staff_comp_code(frm){
	frappe.db.get_value('Job Order',{'name':frm.doc.job_order},['select_job', 'job_site','category'], function(r){
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.create_staff_comp_code",
			args:{
				"job_title": r.select_job,
				"job_site": r.job_site,
				"industry_type":r.category,
				"staff_class_code": frm.doc.staff_class_code?frm.doc.staff_class_code:'' ,
				"staffing_company": frm.doc.company,
				"staff_class_code_rate":frm.doc.staff_class_code_rate
			}
		})
	})
}
function check_class_code(frm){
	if(frm.doc.__islocal==1){
		frappe.call({
			method: "tag_workflow.tag_workflow.doctype.claim_order.claim_order.check_already_exist_class_code",
			args:{
				"job_order":frm.doc.job_order,
				"staffing_company": frm.doc.company,
			},
			callback:function(r){
				if(r.message[0]!='Exist'){
					frm.set_value('staff_class_code',r.message[0]);
					frm.set_value('staff_class_code_rate',r.message[1]);
				}				
			}
		})
	}
}
function hide_class_code_rate(frm){
  if(frm.doc.__islocal==1 && frm.doc.resume_required==0){
    frm.set_df_property('staff_class_code','hidden',1)
    frm.set_df_property('staff_class_code_rate','hidden',1)
  }
}

function add_notes_button(frm){
  const role = frappe.boot.tag.tag_user_info.user_type;
  if(frm.doc.tag_status=="Approved" && frm.doc.resume_required==1 && (role=='Hiring Admin'|| role=='Hiring User')){
    frm.add_custom_button('Update Notes',()=>{
      let d = new frappe.ui.Dialog({
        title: 'Update Notes',
        fields: [
            {
                label: 'Notes',
                fieldname: 'modal_notes',
                fieldtype: 'Small Text',
                reqd:1,
            },
        ],
        primary_action_label: 'Submit',
        primary_action(values) {
            frappe.call({
              method:"tag_workflow.tag_workflow.doctype.assign_employee.assign_employee.update_notes",
              args:{name:cur_frm.doc.name,notes:values.modal_notes}
            })
            d.hide();

        }
    })
    d.show();
    d.fields_dict['modal_notes'].$wrapper.find('textarea').attr('maxlength',160);

    
    })
  }

}
frappe.realtime.on('sync_data',()=>{
  setTimeout(()=>{
    cur_frm.reload_doc();
  },200)
})

function check_company_branch(frm){
  frappe.db.get_value('Company', {'name': frm.doc.company}, ['branch_enabled', 'branch_org_id', 'branch_api_key'], (res)=>{
    if(res.branch_enabled && res.branch_org_id && res.branch_api_key){
      company_branch = 1;
    }else{
      company_branch = 0;
    }
  });
}

function branch_wallet(company, emp_id, emp_name, cdt, cdn){
  if(company_branch == 1){
    frappe.call({
      method: "tag_workflow.utils.branch_integration.get_employee_data",
      args:{
        "emp_id": emp_id,
        "company": company
      },
      freeze:true,
      callback: (res)=>{
        if(res.message){
          if(res.message.includes('Please') || res.message.includes('Branch')){
            remove_row(res.message, emp_name, cdt, cdn);
            frappe.msgprint(res.message);
            frappe.validated = false;
          }else if(Number(res.message)){
            frappe.db.set_value('Employee', emp_id, "account_number", res.message)
          }
        }
      }
    });
  }
}

function remove_row(message, emp_name, cdt, cdn){
  if(message != 'Enable Branch for '+emp_name+'.'){
    let fields = ['employee', 'employee_name', 'resume', 'pay_rate', 'remove_employee', 'job_category', 'company'];
    for(let field in fields){
      frappe.model.set_value(cdt, cdn, fields[field], '');
    }
    cur_frm.refresh_field('employee_details');
  }
}
function check_mandatory_field(emp_id,emp_name){
  frappe.call({
    method:"tag_workflow.tag_data.check_mandatory_field",
    args:{emp_id: emp_id,check: 0,emp_name:emp_name},
    callback: function(r){
      let msg = r.message[1] + " is missing the below required fields. You will be unable to approve their timesheets unless these fields are populated.<br><br>"
      if(r.message != "success"){
        msg += r.message[0]
        frappe.msgprint({message: __(msg), title: __("Warning"), indicator: "yellow",});
      }
    }
  });
}