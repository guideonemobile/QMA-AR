
#import "QMATarget+Create.h"


@implementation QMATarget (Create)

+ (QMATarget *)targetWithLabel:(NSString *)label
       inManagedObjectContext:(NSManagedObjectContext *)moc {
    
    QMATarget *target;
    
    NSFetchRequest *request = [NSFetchRequest fetchRequestWithEntityName:@"QMATarget"];
    request.predicate = [NSPredicate predicateWithFormat:@"label = %@", label];
    NSArray *allMatches = [moc executeFetchRequest:request error:nil];
    
    if (allMatches == nil) {
        QMALog(@"Error: Fetch request failed");
    } else if ([allMatches count] > 1) {
        QMALog(@"Error: More than one target with the same name: %@", label);
    } else if ([allMatches count] == 1) {
        QMALog(@"A target with this name already exists: %@", label);
        target = [allMatches firstObject];
    } else {
        //Create a new QMATarget object
        target = [NSEntityDescription insertNewObjectForEntityForName:@"QMATarget"
                                               inManagedObjectContext:moc];
        
        target.label = label;
    }
    
    return target;
}

- (NSString *)description {
    NSMutableArray *pois = [[NSMutableArray alloc] initWithCapacity:[self.pointsOfInterest count]];
    for (id p in self.pointsOfInterest) {
        [pois addObject:p];
    }    
    return [NSString stringWithFormat:@"<%@: %p, %@>", [self class], self, @{@"Label":self.label, @"POIs":pois}];
}

@end
