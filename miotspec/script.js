$('#getDeviceMetadata').on('click', async function(e) {
  e.preventDefault();

  $('.metadata-section').hide();
  $('.error-section').hide();
  $('.warning-section').hide();
  $('.metadata-table-properties table tbody').empty();
  $('.metadata-table-actions table tbody').empty();
  $('.metadata-table-events table tbody').empty();
  $('a.nav-link.tab-properties').addClass('disabled');
  $('a.nav-link.tab-actions').addClass('disabled');
  $('a.nav-link.tab-events').addClass('disabled');
  $('p.metadata-device-type').hide();

  let modelInput = $('#deviceModelInputMetadata');
  let deviceModel = modelInput.val();

  if (deviceModel) {
    $('.spinner-section').show();
    try {
      const result = await new MiotSpecFetcher().fetchMiotSpecByModel(deviceModel, true);
      showMetadataTable(result);
    } catch (err) {
      showError(err.message);
    }
  } else {
    showWarning('Please specify a device model!');
  }

});

function showMetadataTable(metadata) {
  $('.spinner-section').hide();
  $('.metadata-table-properties table tbody').empty();
  $('.metadata-table-actions table tbody').empty();
  $('.metadata-table-events table tbody').empty();

  if (metadata) {
    $('.metadata-section').show();
    $('.error-section').hide();
    $('.warning-section').hide();

    showMetdataDeviceType(metadata);
    showSpecUrl(metadata);

    if (metadata.properties  && Object.keys(metadata.properties).length > 0) {
      renderProperties(metadata.properties);
      $('a.nav-link.tab-properties').removeClass('disabled');
      bootstrap.Tab.getOrCreateInstance($('a.nav-link.tab-properties')[0]).show();
    }

    if (metadata.actions && Object.keys(metadata.actions).length > 0) {
      renderActions(metadata.actions);
      $('a.nav-link.tab-actions').removeClass('disabled');
    }

    if (metadata.events && Object.keys(metadata.events).length > 0) {
      renderEvents(metadata.events);
      $('a.nav-link.tab-events').removeClass('disabled');
    }

  } else {
    showError('Empty result!');
  }
}

function showError(errorMsg) {
  $('.spinner-section').hide();
  $('.metadata-section').hide();
  $('.warning-section').hide();
  $('.error-section').show();
  $('.error-section p').text(errorMsg);
}

function showWarning(warningMsg) {
  $('.spinner-section').hide();
  $('.metadata-section').hide();
  $('.error-section').hide();
  $('.warning-section').show();
  $('.warning-section p').text(warningMsg);
}

function showMetdataDeviceType(metadata) {
  if (metadata.type) {
    $('p.metadata-device-type').show();
    const type = metadata.type.split(':')[3];
    $('p.metadata-device-type .device-name-location').text(type);
  } else {
    $('p.metadata-device-type').hide();
  }
}

function showSpecUrl(metadata) {
  if (metadata.specUrl) {
    $('p.metadata-device-spec-url').show();
    $('p.metadata-device-spec-url a').text(metadata.specUrl);
    $("p.metadata-device-spec-url a").attr('href', metadata.specUrl);
  } else {
    $('p.metadata-device-spec-url').hide();
  }
}

function renderProperties(properties) {
  Object.keys(properties).forEach(propKey => {
    const prop = properties[propKey];
    let accessStr = null;
    if (prop.access) {
      accessStr = '';
      prop.access.forEach((value) => {
        accessStr = accessStr + getAccessStr(value);
      })
    }
    let valRangeStr = null;
    if (prop.valueRange && prop.valueRange.length === 3) {
      valRangeStr = `Min: ${prop.valueRange[0]}</br>Max: ${prop.valueRange[1]}</br>Step: ${prop.valueRange[2]}</br>`;
    }
    let valListStr = null;
    if (prop.valueList) {
      valListStr = '';
      prop.valueList.forEach((value, key) => {
        valListStr = valListStr + `${value.value} - ${value.description}</br>`;
      })
    }
    let tableEntry =
      `<tr><th scope="row">${formatName(prop.name)}</th><td>${formatId(prop.siid,prop.piid)}</td><td>${prop.description}</td><td>${prop.format || ' - '}</td><td>${accessStr || ' - '}</td><td>${prop.unit || ' - '}</td><td>${valRangeStr || ' - '}</td><td>${valListStr || ' - '}</td></tr>`
    $('.metadata-table-properties table tbody').append(tableEntry);

  });
}

function renderActions(actions) {
  Object.keys(actions).forEach(actionKey => {
    const action = actions[actionKey];
    let tableEntry = `<tr><th scope="row">${formatName(action.name)}</th><td>${formatId(action.siid,action.aiid)}</td><td>${action.description}</td><td>${getArrayValues(action.in)}</td><td>${getArrayValues(action.out)}</td></tr>`
    $('.metadata-table-actions table tbody').append(tableEntry);
  });
}

function renderEvents(events) {
  Object.keys(events).forEach(eventKey => {
    const miotEvent = events[eventKey];
    let tableEntry = `<tr><th scope="row">${formatName(miotEvent.name)}</th><td>${formatId(miotEvent.siid,miotEvent.eiid)}</td>><td>${miotEvent.description}</td><td>${getArrayValues(miotEvent.arguments)}</td></tr>`
    $('.metadata-table-events table tbody').append(tableEntry);
  });
}

function formatName(name) {
  return `<h5><span class="badge bg-dark">${name}</span><h5>`
}

function formatId(siid, id) {
  return `<h5><span class="badge bg-info">${siid}.${id}</span><h5>`
}

function getAccessStr(str) {
  if (str === 'read') {
    return '<span class="badge rounded-pill bg-success">read</span>'
  } else if (str === 'write') {
    return '<span class="badge rounded-pill bg-primary">write</span>'
  } else {
    return '<span class="badge rounded-pill bg-secondary">notify</span>'
  }
}

function getArrayValues(valArray) {
  if (valArray && valArray.length > 0) {
    return valArray;
  }
  return ' - ';
}


//spec fetcher

const ALL_DEVICES_URL = "https://miot-spec.org/miot-spec-v2/instances?status=all";
const INSTANCE_URL = "https://miot-spec.org/miot-spec-v2/instance?type=";


class MiotSpecFetcher {
  constructor() {}


  /*----------========== PUBLIC ==========----------*/

  async fetchMiotSpecFromUrl(specUrl, reduced = false) {
    if (specUrl) {
      //const url = `https://miot-spec.org/miot-spec-v2/instance?type=${spec}`;
      const res = await fetch(specUrl);
      if (!res.ok) {
        throw new Error(`Get spec error with status ${res.statusText}`);
      }
      const result = await this._processMiotFetchResult(res, reduced);
      result.specUrl = specUrl;
      return result;
    } else {
      throw new Error(`No miot spec url specified! Cannot fetch!`);
    }
    return {};
  }

  async fetchMiotSpecByModel(model, reduced = false) {
    let specUrl = undefined;
    specUrl = await this.findDeviceMiotSpecUrlByModel(model);
    return this.fetchMiotSpecFromUrl(specUrl, reduced);
  }

  async findDeviceMiotSpecUrlByModel(model) {
    if (model) {
      const res = await fetch(ALL_DEVICES_URL);
      if (!res.ok) {
        throw new Error(`Get all spec error with status ${res.statusText}`);
      }
      const {
        instances
      } = await res.json();

      const lastFoundSpecIndex = instances.map(spec => spec.model === model).lastIndexOf(true);
      let foundSpec = instances[lastFoundSpecIndex];
      if (foundSpec && foundSpec.type) {
        return INSTANCE_URL + foundSpec.type;
      }
      throw new Error(`Could not find miot spec for model ${model}`);
      return undefined;
    } else {
      throw new Error(`No miot spec url specified! Cannot fetch!`);
    }
    return undefined;
  }


  /*----------========== PRIVATE ==========----------*/

  async _processMiotFetchResult(data, reduced = false) {
    const {
      type,
      description,
      services
    } = await data.json();
    const result = {};
    result.type = type;
    result.description = description;
    result.services = [];
    result.properties = {};
    result.actions = {};
    result.events = {};
    services.forEach(service => {
      const {
        iid,
        type,
        description,
        properties,
        actions,
        events
      } = service;

      // if reduced then skip device information service
      if (reduced && type.includes('device-information')) {
        return;
      }

      let newService = {};
      newService.siid = iid;
      newService.type = type;
      newService.description = description;
      const uniqueServiceName = this._getUniqueServiceName(result.services, type, iid);
      if (properties) {
        properties.forEach(property => {
          const propType = property.type.split(':')[3];
          const name = this._getUniqueItemName(result.properties, uniqueServiceName, propType, property.iid);
          result.properties[name] = {
            name: name,
            siid: service.iid,
            piid: property.iid,
            type: property.type,
            description: property.description,
            format: property.format,
            access: property.access,
            unit: property.unit,
            valueRange: property['value-range'],
            valueList: property['value-list']
          };
        });
      }
      if (actions) {
        actions.forEach(action => {
          const actionType = action.type.split(':')[3];
          const name = this._getUniqueItemName(result.actions, uniqueServiceName, actionType, action.iid);
          result.actions[name] = {
            name: name,
            siid: service.iid,
            aiid: action.iid,
            type: action.type,
            description: action.description,
            in: action.in,
            out: action.out
          };
        });
      }
      if (events) {
        events.forEach(tmpEvent => {
          const eventType = tmpEvent.type.split(':')[3];
          const name = this._getUniqueItemName(result.events, uniqueServiceName, eventType, tmpEvent.iid);
          result.events[name] = {
            name: name,
            siid: service.iid,
            eiid: tmpEvent.iid,
            type: tmpEvent.type,
            description: tmpEvent.description,
            arguments: tmpEvent.arguments
          };
        });
      }
      result.services.push(newService);
    });

    return result;
  }

  _getUniqueServiceName(services, curServiceType, curServiceSiid) {
    const serviceType = curServiceType.split(':')[3];
    const sameServiceExists = services.find(service => service.type.split(':')[3] === serviceType);
    if (sameServiceExists) {
      return `${serviceType}${curServiceSiid}`;
    }
    return serviceType;
  }

  _generateItemName(serviceType, itemType) {
    return [serviceType, itemType].join(':');
  }

  _getUniqueItemName(items, serviceType, itemType, itemIid) {
    let key = this._generateItemName(serviceType, itemType);
    if (key in items) {
      key = this._generateItemName(serviceType, itemType + itemIid);
    }
    return key;
  }

}
