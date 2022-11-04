frappe.provide("frappe.toolbar");
frappe.provide("tag_workflow");

frappe.templates.template_code=`<!DOCTYPE html>
<html lang="en">
  <head>
    <title></title>
    <!-- Required meta tags -->
    <meta charset="utf-8" />
    <meta
      name="viewport"
      content="width=device-width, initial-scale=1, shrink-to-fit=no"
    />

    <style>
      body {
        font-size: 14px;
      }
      .header img:nth-child(2) {
        width: 110px;
      }
      .btn-primary {
        background: #21b9e4 !important;
        text-align: left !important;
        border: 1px solid#21B9E4 !important;
        border-radius: 6px !important;
      }
      .sub-menu .tab-button {
        padding: 10px 0;
        color: #78849e;
        margin: 10px 0;
        font-size: 14px;
        cursor: pointer;
      }
      .sub-menu .tab-button a {
        color: #78849e;
        text-decoration: none;
      }
      .sub-menu .tab-button .btn-link {
        color: #78849e !important;
        font-size: 14px;
        text-decoration: none;
      }
      .sub-menu .dropdown-menu.show {
        border: none !important;
        padding-left: 50px !important;
        font-size: 14px !important;
        color: #78849e !important;
      }
      .sub-menu .dropdown-item {
        color: #78849e !important;
      }
      .sub-menu .tab-button.active {
        background: #e8f8fc;
        color: #2e3c54 !important;
      }
      .sub-menu .tab-button.active::before {
        background: #37c0e6;
        height: 40px;
        width: 4px;
        content: "";
        z-index: 99999999;
        position: absolute;
        margin-top: -10px;
      }
      .sub-menu .tab-button:hover::before {
        background: #37c0e6;
        height: 40px;
        width: 4px;
        content: "";
        z-index: 99999999;
        position: absolute;
        margin-top: -10px;
      }
      .footer-admin img {
        height: 30px;
        margin-top: 5px;
      }
      .footer-admin > div {
        height: 90px;
      }
      .sub-menu {
        height: 100%;
        position: fixed;
        top: 130px;
        width: 220px;
        background: #fff;
        max-width: 200px;
        overflow-y: auto;
        overflow-x: hidden;
        transition: 0.5s ease-in-out;
        z-index: 99;
      }
      .footer-admin .badge-danger {
        background: #f1effd !important;
        color: #7b68ee !important;
        font-size: 12px;
        font-weight: normal;
      }
      .home-tab {
        margin-top: 90px;
      }
      .home-tab .nav-tabs .nav-link.active {
        border: none;
        border-bottom: 2px solid#37C0E6;
        color: #000;
      }
      .home-tab .nav-tabs .nav-link {
        color: #78849e;
        font-size: 14px;
      }
      .home-tab .nav-tabs .nav-link .badge-danger {
        background: #fc646b !important;
        padding: 4px 7px;
        border-radius: 8px;
        margin-left: 5px;
      }
      .home-tab .dropdown .btn-link {
        color: #21b9e4 !important;
      }
      .home-tab .bg-img {
        background: url(abstract-bg.svg);
        background-repeat: no-repeat;
        background-position: right;
        background-size: contain;
      }
      .search-box {
        position: relative;
      }
      .search-box span {
        position: absolute;
        top: 6px;
        left: 10px;
      }
      .search-box input {
        max-width: 503px;
        width: 100%;
        border: 2px solid#79D5EE;
        padding-left: 30px;
        border-radius: 8px;
      }
      ::placeholder {
        color: #acbbd1;
        font-size: 14px;
      }
      .sub-menu a:hover {
        text-decoration: none;
      }
      .sub-menu .custom-btn:hover {
        text-decoration: none;
        background: #e8f8fc;
        transition: 0.2s ease-in-out;
      }
      .sub-menu .inner-menu .active a {
        font-weight: 600;
        word-break: break-word;
      }
      .sub-menu .inner-menu {
        word-break: break-word;
      }
      .sub-menu .inner-menu .active ul li a {
        font-weight: normal;
        word-break: break-word;
      }
      .sub-menu .internal-custom-btn .inner-menu-sec .active a {
        font-weight: 600;
      }
      .sub-menu img {
        margin-top: -5px;
      }
      [data-route="Workspaces/Home"] .sub-menu,
      [data-route=""] .sub-menu {
        top: 61px !important;
        z-index: 9 !important;
        transition: 0.5s ease-in-out;
      }
      .toggle_icon {
        display: none;
      }
      .sub-menu .slide-text {
        display: inline-block;
        width: 80px;
      }
      .custom-slide {
        display: inline-block;
        cursor: pointer;
        margin-top: 8px;
      }

      .bar1,
      .bar2,
      .bar3 {
        width: 17px;
        height: 3px;
        background-color: #333;
        margin: 3px 0;
        transition: 0.4s;
      }

      .change .bar1 {
        -webkit-transform: rotate(-45deg) translate(-1px, 0px);
        transform: rotate(-45deg) translate(-1px, 0px);
      }

      .change .bar2 {
        opacity: 0;
      }

      .change .bar3 {
        -webkit-transform: rotate(45deg) translate(-8px, -8px);
        transform: rotate(45deg) translate(-8px, -8px);
      }
      .inner-area {
        font-style: italic;
        font-size: 13px;
      }

      @media (max-width: 768px) {
        .sub-menu {
          display: none;
          transition: 0.5s ease-in-out;
        }
        .layout-main-section {
          margin-left: 0rem;
        }
        .toggle_icon {
          position: fixed;
          top: 77px;
          z-index: 9999;
          left: 13px;
          font-size: 19px;
          display: block;
          transition: 0.5s ease-in-out;
        }
        .page-title .title-area .title-text {
          padding-left: 20px;
        }
        [data-route="Workspaces/Home"] .sub-menu,
        [data-route=""] .sub-menu {
          top: 130px !important;
        }
      }
    </style>


  </head>
  <body>
    <div class="container-fluid">
      <div class="row">
        <div class="col-xl-2 col-md-2 position-relative">
          <div class="row">
            <div class="toggle_icon">
              <div
                class="custom-slide"
                aria-hidden="true"
                onclick="myFunction(this)"
              >
                <div class="bar1"></div>
                <div class="bar2"></div>
                <div class="bar3"></div>
              </div>
            </div>
            <div class="sub-menu w-100 border-top border-right" id="myDIV">
              {% if frappe.boot.tag.tag_user_info.company_type == "Hiring" ||
              frappe.boot.tag.tag_user_info.company_type == "Exclusive Hiring"
              %}

              <div class="p-md-4 mt-5 mt-md-0 px-3 pb-0 pt-2">
                <button type="button" class="btn btn-primary btn-block">
                  <span class="px-2">&#x2b;</span>New Order
                </button>
              </div>
              {% endif %} {% if frappe.boot.tag.tag_user_info.company_type ==
              "Hiring" || frappe.boot.tag.tag_user_info.company_type ==
              "Exclusive Hiring" || frappe.boot.tag.tag_user_info.company_type
              == "TAG" || frappe.session.user == "Administrator" %}
              <a href="/app/home" class="position-relative">
                <div class="tab-button custom-btn">
                  <img
                    src="/assets/tag_workflow/images/ico-home.svg"
                    class="pr-3 pl-5"
                    alt="home"
                  />Home
                </div>
              </a>
              {% endif %} {% if frappe.boot.tag.tag_user_info.company_type ==
              "Staffing" %}
              <a href="/app/staff-home" class="position-relative">
                <div class="tab-button custom-btn">
                  <img
                    src="/assets/tag_workflow/images/ico-home.svg"
                    class="pr-3 pl-5"
                    alt="home"
                  />Home
                </div>
              </a>
              {% endif %}

              <div class="tab-button custom-btn">
                <ul class="nav order">
                  <li>
                    <a
                      href="#"
                      id="btn-1"
                      data-toggle="collapse"
                      data-target="#submenu1"
                      aria-expanded="false"
                    >
                      <span class="pl-3 ml-3"
                        ><img
                          src="/assets/tag_workflow/images/ico-order.svg"
                          class="pr-3 pl-3"
                          alt="crm"
                      /></span>
                      <span class="slide-text"> Orders </span>
                      <span
                        ><i class="fa fa-angle-down" aria-hidden="true"></i
                      ></span>
                    </a>

                    <ul
                      class="inner-menu pl-5 ml-5 list-unstyled collapse"
                      id="submenu1"
                      role="menu"
                      aria-labelledby="btn-1"
                    >
                      <li class="py-2 mt-2">
                        <a href="#" onclick="job_order_page()">All</a>
                      </li>
                      {% if frappe.boot.tag.tag_user_info.company_type ==
                      "Hiring" || frappe.boot.tag.tag_user_info.company_type ==
                      "Exclusive Hiring" %}
                      <li class="py-2">
                        <a href="/app/staff_company_list">Direct Order</a>
                      </li>
                      {% endif %} {% if
                      frappe.boot.tag.tag_user_info.company_type == "Staffing"
                      %}
                      <li class="py-2">
                        <a href="#" onclick="show_more_menu()">Direct Order</a>
                      </li>

                      {% endif %}
                    </ul>
                  </li>
                </ul>
              </div>
              {% if frappe.boot.tag.tag_user_info.company_type != "Hiring" &&
              frappe.boot.tag.tag_user_info.company_type != "Exclusive Hiring"
              %}
              <div class="tab-button custom-btn">
                <ul class="nav crm">
                  <li>
                    <a
                      href="#"
                      id="btn-1"
                      data-toggle="collapse"
                      data-target="#submenu2"
                      aria-expanded="false"
                    >
                      <span class="pl-3 ml-3"
                        ><img
                          src="/assets/tag_workflow/images/ico-crm.svg"
                          class="pr-3 pl-3"
                          alt="crm"
                      /></span>
                      <span class="slide-text">CRM </span>
                      <span
                        ><i class="fa fa-angle-down" aria-hidden="true"></i
                      ></span>
                    </a>
                    <ul
                      class="inner-menu pl-5 ml-5 list-unstyled collapse"
                      id="submenu2"
                      role="menu"
                      aria-labelledby="btn-1"
                    >
                      <li class="py-2 mt-2">
                        <a href="#" onclick="contact_page()">Contacts</a>
                      </li>
                      <li class="py-2" data="lead">
                        <a href="#" onclick="lead_page()">Leads</a>
                      </li>
                      <li class="py-2">
                        <a href="/app/staffing-email">Emails</a>
                      </li>
                      <li class="py-2"><a href="/app/contract">Contract</a></li>
                    </ul>
                  </li>
                </ul>
              </div>

              <div class="tab-button custom-btn">
                <ul class="nav crm">
                  <li>
                    <a
                      href="#"
                      id="2"
                      data-toggle="collapse"
                      data-target="#submenu3"
                      aria-expanded="false"
                    >
                      <span class="pl-3 ml-3"
                        ><img
                          src="/assets/tag_workflow/images/ico-ats.svg"
                          class="pr-3 pl-3"
                          alt="crm"
                      /></span>
                      <span class="slide-text">ATS </span>
                      <span
                        ><i class="fa fa-angle-down" aria-hidden="true"></i
                      ></span>
                    </a>
                    <ul
                      class="inner-menu pl-5 ml-5 list-unstyled collapse"
                      id="submenu3"
                      role="menu"
                      aria-labelledby="btn-2"
                    >
                      <li class="py-2 mt-1">
                        <a href="#" onclick="onboarding_page()">Onboarding</a>
                      </li>
                      <li class="py-2">
                        <a href="/app/employee-onboarding-template">Set Up</a>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>

              <a href="#" onclick="employee_page()">
                <div class="tab-button custom-btn">
                  <img
                    src="/assets/tag_workflow/images/ico-employee.svg"
                    class="pr-3 pl-5"
                    alt="employee"
                  />Employees
                </div>
              </a>
              {% endif %}

              <a href="/app/reports">
                <div class="tab-button custom-btn">
                  <img
                    src="/assets/tag_workflow/images/ico-invoice.svg"
                    class="pr-3 pl-5"
                    alt="reports"
                  />Reports
                </div>
              </a>

              <a href="/app/sales-invoice">
                <div class="tab-button custom-btn">
                  <img
                    src="/assets/tag_workflow/images/ico-invoices.svg"
                    class="pr-3 pl-5"
                    alt="invoice"
                  />Invoices
                </div>
              </a>

              {% if frappe.boot.tag.tag_user_info.company_type != "Hiring" &&
              frappe.boot.tag.tag_user_info.company_type != "Exclusive Hiring"
              %}
              <div class="tab-button custom-btn internal-custom-btn">
                <ul class="nav crm">
                  <li>
                    <a
                      href="#"
                      id="3"
                      data-toggle="collapse"
                      data-target="#submenu4"
                      aria-expanded="false"
                    >
                      <span class="pl-3 ml-3"
                        ><img
                          src="/assets/tag_workflow/images/payroll.svg"
                          class="pr-2 pl-3"
                          alt="crm"
                      /></span>
                      <span class="slide-text"> Payroll </span>
                      <span
                        ><i class="fa fa-angle-down" aria-hidden="true"></i
                      ></span>
                    </a>
                    <ul
                      class="inner-menu pl-5 ml-5 list-unstyled collapse"
                      id="submenu4"
                      role="menu"
                      aria-labelledby="btn-2"
                    >
                      <li class="py-2 mt-1">
                        <a
                          href="#"
                          id="4"
                          class=""
                          data-toggle="collapse"
                          data-target="#submenu5"
                          aria-expanded="false"
                          ><span class="slide-text"> Set Up </span>
                          <span
                            ><i class="fa fa-angle-down" aria-hidden="true"></i
                          ></span>
                        </a>
                        <div class="inner-area">
                          <ul
                            class="inner-menu pl-0 ml-0 list-unstyled collapse"
                            id="submenu5"
                            role="menu"
                            aria-labelledby="btn-2"
                          >
                            <li class="py-1 mt-1" onclick="showActive1()">
                              <a href="/app/salary-component" id="first">
                                Earnings / Deductions
                              </a>
                            </li>
                            <li class="py-1 mt-1" onclick="showActive2()">
                              <a href="/app/salary-structure" id="second">
                                Salary Structure
                              </a>
                            </li>
                            <li class="py-1 mt-1" onclick="showActive3()">
                              <a
                                href="/app/salary-structure-assignment"
                                id="third"
                              >
                                Salary Structure Assignment
                              </a>
                            </li>
                          </ul>
                        </div>
                      </li>
                      <li class="py-2">
                        <a href="/app/salary-slip">Salary Slip</a>
                      </li>
                      <li class="py-2">
                        <a href="/app/payroll-period">Payroll Period</a>
                      </li>
                      <li class="py-2">
                        <a href="/app/payroll-entry">Payroll Entry</a>
                      </li>
                    </ul>
                  </li>
                </ul>
              </div>
              {% endif %}

              <!-- user info -->
              <div class="row footer-admin border-top pl-4 py-4">
                <div class="d-flex">
                  <div>
                    <img
                      src="/assets/tag_workflow/images/ico-maps.jpeg"
                      class="img-fluid px-3"
                      alt="user-image"
                    />
                  </div>
                  <div class="pr-3">
                    <h5 class="mb-0">
                      <strong>{{frappe.session.user_fullname}}</strong>
                    </h5>
                    <span class="badge badge-danger">
                      {% if frappe.session.user_fullname == "Administrator" %}
                      {{ __("Master Admin") }} {% else %} {{
                      frappe.boot.tag.tag_user_info.user_type }} {% endif %}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    <script>
      function myFunction(x) {
        x.classList.toggle("change");
      }
    </script>

  </body>
</html>

<script>
  function showActive1() {
    $("#first").css("font-weight", "600");
    $("#second").css("font-weight", "normal");
    $("#third").css("font-weight", "normal");
  }

  function showActive2() {
    $("#first").css("font-weight", "normal");
    $("#second").css("font-weight", "600");
    $("#third").css("font-weight", "normal");
  }

  function showActive3() {
    $("#first").css("font-weight", "normal");
    $("#second").css("font-weight", "normal");
    $("#third").css("font-weight", "600");
  }

  $(".btn.btn-primary.btn-block").click(function () {
    let order = frappe.model.get_new_doc("Job Order");
    frappe.set_route("form", order.doctype, order.name);
  });

  $(".sub-menu .custom-btn").on("click", function () {
    $(".sub-menu .custom-btn").removeClass("active");
    $(this).addClass("active");
  });

  $(document).ready(function () {
    $(".toggle_icon").click(function () {
      $(".sub-menu").toggle();
    });
  });

  $(".order li ul li").on("click", function () {
    $(".order li ul li").removeClass("active");
    $(this).addClass("active");
  });

  $(".crm li ul li").on("click", function () {
    $(".crm li ul li").removeClass("active");
    $(this).addClass("active");
  });

  function show_more_menu() {
    location.href = "/app/job-order?data=direct";
  }

  function job_order_page() {
    location.href = "/app/job-order";
  }
  function lead_page() {
    location.href = "/app/lead";
  }
  function employee_page() {
    location.href = "/app/employee";
  }
  function contact_page() {
    location.href = "/app/contact";
  }
  function onboarding_page(){
    location.href = "/app/employee-onboarding";
  }
</script>

<script>
  window["_fs_debug"] = false;
  window["_fs_host"] = "fullstory.com";
  window["_fs_script"] = "edge.fullstory.com/s/fs.js";
  window["_fs_org"] = frappe.boot.tag.tag_user_info.org;
  window["_fs_namespace"] = "FS";
  (function (m, n, e, t, l, o, g, y) {
    if (e in m) {
      if (m.console && m.console.log) {
        m.console.log(
          "test"
        );
      }
      return;
    }
    g = m[e] = function (a, b, s) {
      g.q ? g.q.push([a, b, s]) : g._api(a, b, s);
    };
    g.q = [];
    o = n.createElement(t);
    o.async = 1;
    o.crossOrigin = "anonymous";
    o.src = "https://" + _fs_script;
    y = n.getElementsByTagName(t)[0];
    y.parentNode.insertBefore(o, y);
    g.identify = function (i, v, s) {
      g(l, { uid: i }, s);
      if (v) g(l, v, s);
    };
    g.setUserVars = function (v, s) {
      g(l, v, s);
    };
    g.event = function (i, v, s) {
      g("event", { n: i, p: v }, s);
    };
    g.anonymize = function () {
      g.identify(!!0);
    };
    g.shutdown = function () {
      g("rec", !1);
    };
    g.restart = function () {
      g("rec", !0);
    };
    g.log = function (a, b) {
      g("log", [a, b]);
    };
    g.consent = function (a) {
      g("consent", !arguments.length || a);
    };
    g.identifyAccount = function (i, v) {
      o = "account";
      v = v || {};
      v.acctId = i;
      g(o, v);
    };
    g.clearUserCookie = function () {};
    g.setVars = function (n, p) {
      g("setVars", [n, p]);
    };
    g._w = {};
    y = "XMLHttpRequest";
    g._w[y] = m[y];
    y = "fetch";
    g._w[y] = m[y];
    if (m[y])
      m[y] = function () {
        return g._w[y].apply(this, arguments);
      };
    g._v = "1.3.0";
  })(window, document, window["_fs_namespace"], "script", "user");
</script>`
$(document).bind('toolbar_setup', function() {
	$(".dropdown-help").empty();
	$('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo.png">`);
	if(window.screen.width>768){
		$('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo.png">`);
	}else {
		$('.navbar-home').html(`<img class="app-logo" src="/assets/tag_workflow/images/TAG-Logo-Emblem.png">`);		
	}

	frappe.ui.toolbar.route_to_company = function() {
		location.href = '/app/company/'+frappe.boot.tag.tag_user_info.company;
	};
});

$(document).ready(function(){
	if(frappe.boot && frappe.boot.home_page!=='setup-wizard'){
		$(frappe.render_template("template_code",'')).appendTo($(".main-section"));
	}

	if(window.location.pathname == "/app/staff-home"){
                setTimeout(frappe.breadcrumbs.clear(), 5000);
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

		let me = this;
		$(this.frm.wrapper).bind("render_complete", function() {
			me.refresh();
		});
	},

	setup_help: function() {
		let me = this;
		this.frm.page.add_action_item(__("Help"), function() {
			frappe.workflow.setup(me.frm.doctype);
			let state = me.get_state();
			let d = new frappe.ui.Dialog({
				title: "Workflow: "
					+ frappe.workflow.workflows[me.frm.doctype].name
			})
			let next_html = $.map(frappe.workflow.get_transitions(me.frm.doctype, state),
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
		let state = this.get_state();

		if(state) {
			// show actions from that state
			this.show_actions(state);
		}

	},

	show_actions: function(state) {
		let added = false;
		let me = this;
		this.frm.page.clear_actions_menu();

		// if the loaded doc is dirty, don't show workflow buttons
		if (this.frm.doc.__unsaved===1) {
			return;
		}

		frappe.workflow.get_transitions(this.frm.doc, state).then(transitions => {
			$.each(transitions, function(_i, d) {
				if(frappe.user_roles.includes(d.allowed)) {
					added = true;
					me.frm.page.add_action_item(__(d.action), function() {
						let action = d.action;
						// capture current state
						if(action  == "Reject"){
							me.frm.doc.__tran_state = d;
						}else{
							unreject(me,d)
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
		let default_state = frappe.workflow.get_default_state(this.frm.doctype, this.frm.doc.docstatus);
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
		let me = this;
		this.dropdown.on("click", "[data-action]", function() {
			me._bind = '0'
		})
	},

});

/*------------------------------------------------*/
frappe.form.link_formatters['Employee'] = function(value, doc) {
	if(doc && doc.employee_name && doc.employee_name !== value) {
		return value ? doc.employee_name + ': ' + value : doc.employee_name;
	} else {
		return value;
	}
}
function unreject(me,d) {
	let doc_before_action = copy_dict(me.frm.doc);
	// set new state
	let next_state = d.next_state;
	me.frm.doc[me.state_fieldname] = next_state;

	let new_state = frappe.workflow.get_document_state(me.frm.doctype, next_state);
	new_state.update_field = me.state_fieldname;
	let new_docstatus = cint(new_state.doc_status);

	if(new_state.update_field) {
		me.frm.set_value(new_state.update_field, "");
		me.frm.set_value(new_state.update_field, new_state.update_value);
		cur_frm.refresh_field(new_state.update_field);
	}

	// revert state on error
	let on_error = function() {
		// reset in locals
		frappe.model.add_to_locals(doc_before_action);
		me.frm.refresh();
	}

	// success - add a comment
	let success = function() {
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
/*----------fields-----------*/
tag_workflow.UpdateField = function update_field(frm, field){
	if(field == "map"){
		frm.set_value("enter_manually", 0);
		frm.set_df_property('map','hidden',0);
	}else{
		frm.set_value("search_on_maps", 0);
		frm.set_df_property('map','hidden',1)
	}
}

frappe.ui.form.ControlInput.prototype.set_label = function(label) {
	if(this.value && !['Checkbox', 'Password','Attach Image','Text Editor'].includes(this.df.fieldtype)){
		if(this.df.fieldtype=='Currency'){
			this.$wrapper.attr("title", "$"+this.value.toFixed(2));
		}
		else if(this.df.fieldtype=='Date'){
			let date = this.value.split('-');
			let date_label = date[1]+"-"+date[2]+"-"+date[0];
			this.$wrapper.attr("title", __(date_label));
		}
		else if(this.df.fieldtype=='Time'){
			let time = this.value.split(':');
			let time_label = time[0]+":"+time[1];
			this.$wrapper.attr("title", __(time_label));
		}
		else if(this.df.fieldtype=='Datetime'){
			let datetime = this.value.split(' ');
			let new_date = datetime[0].split('-');
			let new_time = datetime[1].split(':');
			let datetime_label = new_date[1]+"-"+new_date[2]+"-"+new_date[0]+" "+new_time[0]+":"+new_time[1];
			this.$wrapper.attr("title", __(datetime_label));
		}
		else if(this.df.fieldtype=='Float'){
			this.$wrapper.attr("title", this.value.toFixed(2));
		}
		else if(this.df.fieldtype == 'Attach'){
			let attach_label = this.value.split('/');
			this.$wrapper.attr('title',attach_label[attach_label.length-1]);
		}
		else{
			this.$wrapper.attr('title',this.value);
		}
	}

	if(label) this.df.label = label;
	if(this.only_input || this.df.label==this._label)
		return;
	let icon = "";
	this.label_span.innerHTML = (icon ? '<i class="'+icon+'"></i> ' : "") +
		__(this.df.label)  || "&nbsp;";
	this._label = this.df.label;
};

/*----------------------------------------*/
function redirect_job(name, child_name){
	console.log(name, child_name);
	window.location.href = '/app/assign-employee/'+name;
}

function remove_job(name, job,employee_id,removed){
	$('.modal-content').hide()
	frappe.call({
		method:'tag_workflow.tag_data.remove_emp_from_order',
		'args':{
			'assign_emp':name,
			'employee_name':employee_id,
			'job_order':job,
			'removed':removed
		},
		callback:function(r){
			if(r.message){
				if(r.message=='removed'){
					frappe.msgprint('Employee removed successfully')
				}
				else if(r.message=='unremoved'){
					frappe.msgprint('Employee unremoved successfully')
				}
				else if(r.message=='emp_not_required'){
					frappe.msgprint('No Employee is required for this job order')
				}
				else{
					frappe.msgprint('Something went wrong. Please try again')
				}
			}
			setTimeout(function(){
				window.location.reload()
			},4000)
		}
	})
}
