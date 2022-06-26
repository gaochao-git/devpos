from ansible.cli.inventory import InventoryCLI
from ansible.inventory.manager import InventoryManager
from ansible.vars.manager import VariableManager
from ansible.parsing.dataloader import DataLoader
from tempfile import mkstemp
import os


def ini2json(params):
    """
    ansible inifile格式解析为json
    :param params:
    :return:
    """
    inifile = mkstemp()[1]
    with open(inifile, 'w') as fp:
        fp.write(params)
    loader = DataLoader()
    inventory = InventoryManager(loader=loader, sources=inifile)
    os.remove(inifile)
    variable_manager = VariableManager(loader=loader, inventory=inventory)
    top = inventory.groups.get('all')
    params = ['-i', inifile, '--list']
    cli = InventoryCLI(params)
    cli.loader = loader
    cli.inventory = inventory
    cli.vm = variable_manager
    super(InventoryCLI, cli).run()
    json_info = cli.json_inventory(top)
    hosts_info = json_info['_meta']['hostvars']
    return hosts_info