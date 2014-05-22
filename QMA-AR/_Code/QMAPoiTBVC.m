
#import "QMAPoiTBVC.h"


@interface QMAPoiTBVC ()

@end


@implementation QMAPoiTBVC

- (void)assignFetchRequest:(NSFetchRequest *)fetchRequest {
    NSManagedObjectContext *moc = self.managedDocument.managedObjectContext;
    if (fetchRequest && moc) {
        self.frc = [[NSFetchedResultsController alloc] initWithFetchRequest:fetchRequest
                                                       managedObjectContext:moc
                                                         sectionNameKeyPath:nil
                                                                  cacheName:nil];
    } else {
        self.frc = nil;
    }
}

#pragma mark - UITableViewDataSource

- (UITableViewCell *)tableView:(UITableView *)tableView cellForRowAtIndexPath:(NSIndexPath *)indexPath {
    
    static NSString *cellIdentifier = @"POICell";
    UITableViewCell *cell = [tableView dequeueReusableCellWithIdentifier:cellIdentifier];
    cell.textLabel.text = @"Sample Text";
    
    return cell;
}

@end
