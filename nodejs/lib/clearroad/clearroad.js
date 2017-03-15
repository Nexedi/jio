
function ClearRoadAccountRegistration(login, password) {
  if (!(this instanceof ClearRoadAccountRegistration)) {
      return new ClearRoadAccountRegistration();
    }
  
  var DATABASE = "cr-account-registration";


  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: false,
    conflict_handling: 1,
    check_local_modification: false,
    check_local_creation: true,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: false,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
      }
    },
    remote_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      mapping_dict: {"portal_type": ["equalValue", "Road Account Message"],
                    "parent_relative_url": ["equalValue", "road_account_message_module"]},
      sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_view",
        login: login,
        password: password
      }
    }
  });
}
ClearRoadAccountRegistration.prototype = new ClearRoadAccountRegistration();
ClearRoadAccountRegistration.prototype.constructor = ClearRoadAccountRegistration;
ClearRoadAccountRegistration.prototype.post = function(){
  return this.jio.post.apply(this.jio, arguments);
};
ClearRoadAccountRegistration.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};

function ClearRoadAccountRegistrationReport(login, password, day_range) {
  if (!(this instanceof ClearRoadAccountRegistrationReport)) {
      return new ClearRoadAccountRegistrationReport();
    }
  
  var DATABASE = "cr-account-registration-report";

  var query = 'portal_type:"Road Account Message"';
  if (day_range !== undefined){
    var from_date = new Date();
    from_date.setDate(from_date.getDate() - day_range);
    query += ' AND modification_date: >="'+from_date.toJSON()+'"';
  }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : query,
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_ingestion_report_view",
        login: login,
        password: password
    }
  });
}
ClearRoadAccountRegistrationReport.prototype = new ClearRoadAccountRegistrationReport();
ClearRoadAccountRegistrationReport.prototype.constructor = ClearRoadAccountRegistrationReport;
ClearRoadAccountRegistrationReport.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadAccountRegistrationReport.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'comment', 'state'], query : 'portal_type:"Road Account Message"'}]);
};


function ClearRoadUsageData(login, password) {
  if (!(this instanceof ClearRoadUsageData)) {
      return new ClearRoadUsageData();
    }
  
  var DATABASE = "cr-road-usage-data";

  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: false,
    conflict_handling: 1,
    check_local_modification: false,
    check_local_creation: true,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: false,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
      }
    },
    remote_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      mapping_dict: {"portal_type": ["equalValue", "Road Message"],
                    "parent_relative_url": ["equalValue", "road_message_module"]},
      sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_view",
        login: login,
        password: password
      }
    }
  });
}
ClearRoadUsageData.prototype = new ClearRoadUsageData();
ClearRoadUsageData.prototype.constructor = ClearRoadUsageData;
ClearRoadUsageData.prototype.post = function(){
  return this.jio.post.apply(this.jio, arguments);
};
ClearRoadUsageData.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};

function ClearRoadUsageDataReport(login, password, day_range) {
  if (!(this instanceof ClearRoadUsageDataReport)) {
      return new ClearRoadUsageDataReport();
    }
  
  var DATABASE = "cr-road-usage-data-report";

  var query = 'portal_type:"Road Message"';
  if (day_range !== undefined){
    var from_date = new Date();
    from_date.setDate(from_date.getDate() - day_range);
    query += ' AND modification_date: >="'+from_date.toJSON()+'"';
  }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : query,
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "query",
      sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory",
          database: DATABASE
        }
      }
    },
    remote_sub_storage: {
      type: "erp5",
      url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
      default_view_reference: "jio_ingestion_report_view",
      login: login,
      password: password
    }
  });
}
ClearRoadUsageDataReport.prototype = new ClearRoadUsageDataReport();
ClearRoadUsageDataReport.prototype.constructor = ClearRoadUsageDataReport;
ClearRoadUsageDataReport.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadUsageDataReport.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'comment', 'state'], query : 'portal_type:"Road Message"'}]);
};


function ClearRoadAccountDirectory(login, password) {
  if (!(this instanceof ClearRoadAccountDirectory)) {
      return new ClearRoadAccountDirectory();
    }
  
  var DATABASE = "cr-account-directory";

  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : 'portal_type:"Road Account"',
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_directory_view",
        login: login,
        password: password
    }
  });
}
ClearRoadAccountDirectory.prototype = new ClearRoadAccountDirectory();
ClearRoadAccountDirectory.prototype.constructor = ClearRoadAccountDirectory;
ClearRoadAccountDirectory.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadAccountDirectory.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'registrations'], query : 'portal_type:"Road Account"'}]);
};

function ClearRoadAccountBalance(login, password, reference) {
  if (!(this instanceof ClearRoadAccountBalance)) {
      return new ClearRoadAccountBalance();
    }
  
  var DATABASE = "cr-account-balance";

  if (reference === undefined){
    return ;
    }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : 'portal_type:"Billing Period" AND reference: ="'+reference+'"'
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_balance_view",
        login: login,
        password: password
    }
  });
}
ClearRoadAccountBalance.prototype = new ClearRoadAccountBalance();
ClearRoadAccountBalance.prototype.constructor = ClearRoadAccountBalance;
ClearRoadAccountBalance.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadAccountBalance.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'start_date', 'stop_date', 'balance'], query : 'portal_type:"Billing Period"'}]);
};

function ClearRoadEvent(login, password) {
  if (!(this instanceof ClearRoadEvent)) {
      return new ClearRoadEvent();
    }
  
  var DATABASE = "cr-event-data";

  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: false,
    conflict_handling: 1,
    check_local_modification: false,
    check_local_creation: true,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: false,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
      }
    },
    remote_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      mapping_dict: {"portal_type": ["equalValue", "Road Event Message"],
                    "parent_relative_url": ["equalValue", "road_event_message_module"]},
      sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_view",
        login: login,
        password: password
      }
    }
  });
}
ClearRoadEvent.prototype = new ClearRoadEvent();
ClearRoadEvent.prototype.constructor = ClearRoadEvent;
ClearRoadEvent.prototype.post = function(){
  return this.jio.post.apply(this.jio, arguments);
};
ClearRoadEvent.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};

function ClearRoadEventReport(login, password, day_range) {
  if (!(this instanceof ClearRoadEventReport)) {
      return new ClearRoadEventReport();
    }
  
  var DATABASE = "cr-event-report";

  var query = 'portal_type:"Road Event Message"';
  if (day_range !== undefined){
    var from_date = new Date();
    from_date.setDate(from_date.getDate() - day_range);
    query += ' AND modification_date: >="'+from_date.toJSON()+'"';
  }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : query,
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "query",
      sub_storage: {
        type: "uuid",
        sub_storage: {
          type: "memory",
          database: DATABASE
        }
      }
    },
    remote_sub_storage: {
      type: "erp5",
      url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
      default_view_reference: "jio_ingestion_report_view",
      login: login,
      password: password
    }
  });
}
ClearRoadEventReport.prototype = new ClearRoadEventReport();
ClearRoadEventReport.prototype.constructor = ClearRoadEventReport;
ClearRoadEventReport.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadEventReport.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'comment', 'state'], query : 'portal_type:"Road Event Message"'}]);
};


function ClearRoadEventDirectory(login, password, day_range) {
  if (!(this instanceof ClearRoadEventDirectory)) {
      return new ClearRoadEventDirectory();
    }
  
  var DATABASE = "cr-event-directory";

  var query = 'portal_type:"Road Event" AND simulation_state: !="rejected"';
  if (day_range !== undefined){
    var from_date = new Date();
    from_date.setDate(from_date.getDate() - day_range);
    query += ' AND modification_date: >="'+from_date.toJSON()+'"';
  }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : query,
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_view",
        login: login,
        password: password
    }
  });
}
ClearRoadEventDirectory.prototype = new ClearRoadEventDirectory();
ClearRoadEventDirectory.prototype.constructor = ClearRoadEventDirectory;
ClearRoadEventDirectory.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadEventDirectory.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['event_date', 'report_date', 'obu_reference', 'vehicle_reference', 'type', 'state'], query : 'portal_type:"Road Event"'}]);
};

function ClearRoadBillingPeriodRegistration(login, password) {
  if (!(this instanceof ClearRoadBillingPeriodRegistration)) {
      return new ClearRoadBillingPeriodRegistration();
    }
  var DATABASE = "cr-billing-period-registration";

  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: false,
    conflict_handling: 1,
    check_local_modification: false,
    check_local_creation: true,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: false,
    check_remote_deletion: false,
    local_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
      }
    },
    remote_sub_storage: {
      type: "mapping",
      map_id: ["equalSubProperty", "reference"],
      mapping_dict: {"portal_type": ["equalValue", "Billing Period Message"],
                    "parent_relative_url": ["equalValue", "billing_period_message_module"]},
      sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_view",
        login: login,
        password: password,
      }
    }
  });
}
 
ClearRoadBillingPeriodRegistration.prototype = new ClearRoadBillingPeriodRegistration();

ClearRoadBillingPeriodRegistration.prototype.constructor = ClearRoadBillingPeriodRegistration;
ClearRoadBillingPeriodRegistration.prototype.post = function(){
  return this.jio.post.apply(this.jio, arguments);
};
ClearRoadBillingPeriodRegistration.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};

function ClearRoadBillingPeriodRegistrationReport(login, password, day_range) {
  if (!(this instanceof ClearRoadBillingPeriodRegistrationReport)) {
      return new ClearRoadBillingPeriodRegistrationReport();
    }
  
  var DATABASE = "cr-billing-period-registration-report";

  var query = 'portal_type:"Billing Period Message"';
  if (day_range !== undefined){
    var from_date = new Date();
    from_date.setDate(from_date.getDate() - day_range);
    query += ' AND modification_date: >="'+from_date.toJSON()+'"';
  }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : query,
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_ingestion_report_view",
        login: login,
        password: password
    }
  });
}
ClearRoadBillingPeriodRegistrationReport.prototype = new ClearRoadBillingPeriodRegistrationReport();
ClearRoadBillingPeriodRegistrationReport.prototype.constructor = ClearRoadBillingPeriodRegistrationReport;
ClearRoadBillingPeriodRegistrationReport.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadBillingPeriodRegistrationReport.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'comment', 'state'], query : 'portal_type:"Billing Period Message"'}]);
};

function ClearRoadBillingPeriodDirectory(login, password) {
  if (!(this instanceof ClearRoadBillingPeriodDirectory)) {
      return new ClearRoadBillingPeriodDirectory();
    }
  
  var DATABASE = "cr-billing-period-directory";

  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : 'portal_type:"Billing Period"',
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_directory_view",
        login: login,
        password: password
    }
  });
}
ClearRoadBillingPeriodDirectory.prototype = new ClearRoadBillingPeriodDirectory();
ClearRoadBillingPeriodDirectory.prototype.constructor = ClearRoadBillingPeriodDirectory;
ClearRoadBillingPeriodDirectory.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadBillingPeriodDirectory.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'start_date', 'stop_date'], query : 'portal_type:"Billing Period"'}]);
};


function ClearRoadTransactionDirectory(login, password, account) {
  if (!(this instanceof ClearRoadTransactionDirectory)) {
      return new ClearRoadTransactionDirectory();
    }
  
  var DATABASE = "cr-transaction-directory";

  var query = 'portal_type:"Road Account"';
  if (account !== undefined){
    query += ' AND reference: ="'+account+'"';
  }
  this.jio = jIO.createJIO({
    type: "replicate",
    use_remote_post: true,
    conflict_handling: 1,
    query: {
      query : query,
      sort_on: [['modification_date', 'descending']],
      limit: [0, 1234567890]
    },
    check_local_modification: false,
    check_local_creation: false,
    check_local_deletion: false,
    check_remote_modification: false,
    check_remote_creation: true,
    check_remote_deletion: false,
    local_sub_storage: {
        type: "query",
        sub_storage: {
          type: "uuid",
          sub_storage: {
            type: "memory",
            database: DATABASE
          }
        }
    },
    remote_sub_storage: {
        type: "erp5",
        url: "https://softinst69465.host.vifib.net/erp5/web_site_module/hateoas",
        default_view_reference: "jio_transactions_view",
        login: login,
        password: password
    }
  });
}
ClearRoadTransactionDirectory.prototype = new ClearRoadTransactionDirectory();
ClearRoadTransactionDirectory.prototype.constructor = ClearRoadTransactionDirectory;
ClearRoadTransactionDirectory.prototype.sync = function(){
  return this.jio.repair.apply(this.jio, arguments);
};
ClearRoadTransactionDirectory.prototype.allDocs = function(){
  return this.jio.allDocs.apply(this.jio, [{select_list: ['reference', 'transactions'], query : 'portal_type:"Road Account"'}]);
};

// Exports to node
exports.ClearRoadAccountRegistration = ClearRoadAccountRegistration;
exports.ClearRoadAccountRegistrationReport = ClearRoadAccountRegistrationReport;
exports.ClearRoadUsageData = ClearRoadUsageData;
exports.ClearRoadUsageDataReport = ClearRoadUsageDataReport;
exports.ClearRoadAccountDirectory = ClearRoadAccountDirectory;
exports.ClearRoadAccountBalance = ClearRoadAccountBalance;
exports.ClearRoadEvent = ClearRoadEvent;
exports.ClearRoadEventReport = ClearRoadEventReport;
exports.ClearRoadEventDirectory = ClearRoadEventDirectory;
exports.ClearRoadBillingPeriodRegistration = ClearRoadBillingPeriodRegistration;
exports.ClearRoadBillingPeriodRegistrationReport = ClearRoadBillingPeriodRegistrationReport;
exports.ClearRoadBillingPeriodDirectory = ClearRoadBillingPeriodDirectory;
exports.ClearRoadTransactionDirectory = ClearRoadTransactionDirectory;
